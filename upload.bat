@echo off
cd /d "C:\Users\Lunar\Documents\scram\Flux"

echo Starting S3 sync...
aws s3 sync . s3://sstudyingtipsforyou

echo.
echo Sync complete.
pause