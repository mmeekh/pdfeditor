# temizle-yeniden-baslat.sh
set -euo pipefail

REPO_DIR="$HOME/pdfeditor"

echo "==> (1) İsteğe bağlı: Caddy verilerini yedekle (varsa)"
[ -d /var/lib/caddy ] && tar -czf "$HOME/caddy_backup_$(date +%F_%H%M).tgz" /var/lib/caddy || true
[ -d /data/caddy ]     && tar -czf "$HOME/caddy_data_backup_$(date +%F_%H%M).tgz" /data/caddy     || true

echo "==> (2) Repo'ya geç ve güncelle"
cd "$REPO_DIR"
git fetch origin
git pull --ff-only

echo "==> (3) Stack'i durdur (volümleri SİLME)"
docker compose down --remove-orphans

echo "==> (4) Docker kalıntılarını temizle (volümleri DOKUNMA)"
docker container prune -f
docker image prune -af
docker builder prune -af
docker network prune -f

echo "==> (5) Sıfırdan derle"
docker compose build --no-cache

echo "==> (6) Stack'i kaldır"
docker compose up -d

echo "==> (7) Hızlı sağlık ve log kontrolü"
docker compose ps
docker compose logs -n 80 caddy || true
docker compose logs -n 80 api   || true

echo "==> (8) Dış doğrulama (başlık kontrolü)"
curl -I -s https://pdfislemleri.com | head -n 10

echo "==> (9) OG görselleri başlık testi"
for u in home-og.jpeg about-og.jpeg blog-og.jpeg; do
  echo "--- $u ---"
  curl -I -A "Mozilla/5.0" -s "https://pdfislemleri.com/images/$u" | grep -iE 'HTTP/|content-type|last-modified'
done

echo "Bitti ✅"
