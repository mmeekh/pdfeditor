#!/bin/bash
# Haftalık SEO raporu — her Pazartesi 09:00

export GA4_PROPERTY_ID=502254935
cd /root/projects/pdfislemleri.com
/usr/bin/python3 scripts/seo_report.py --days 7 >> reports/cron.log 2>&1
echo "[$(date -Iseconds)] Rapor üretildi" >> reports/cron.log
