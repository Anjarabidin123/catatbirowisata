@echo off
echo ========================================================
echo       PUSH KE GITHUB (CATAT BIRO WISATA - SSH)
echo ========================================================
cd /d "E:\project iseng\trip-catat-app"

echo.
echo [1/4] Memeriksa remote origin SSH...
git remote set-url origin git@github.com:Anjarabidin123/catatbirowisata.git

echo.
echo [2/4] Menambahkan semua perubahan file...
git add .

echo.
echo [3/4] Membuat commit...
git commit -m "feat: tambahkan dropdown menu aksi trip, optimasi catatan dan urutan buku kas biro"

echo.
echo [4/4] Melakukan push ke origin main via SSH...
git push origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo [BERHASIL] Seluruh perubahan berhasil di-push ke GitHub!
) else (
    echo [PERHATIAN] Terjadi kendala saat push. Cek koneksi atau SSH key Anda.
)
echo ========================================================
pause
