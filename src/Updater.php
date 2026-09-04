<?php
declare(strict_types=1);

final class Updater
{
    private const ARCHIVE = 'https://codeload.github.com/gitreprtc/mymusiccollection/zip/refs/heads/main';

    public static function install(string $root, string $storage): string
    {
        if (!extension_loaded('zip') || !class_exists('ZipArchive')) {
            throw new RuntimeException('De PHP-extensie ZipArchive is vereist voor veilig updaten.');
        }
        if (!is_writable($root)) {
            throw new RuntimeException('De programmamap is niet schrijfbaar voor PHP. Geef de webgebruiker schrijfrechten op de appmap.');
        }
        $token = bin2hex(random_bytes(8));
        $archive = $storage . '/update-' . $token . '.zip';
        $stage = $storage . '/update-' . $token;
        try {
            self::download(self::ARCHIVE, $archive);
            mkdir($stage, 0700, true);
            $zip = new ZipArchive();
            if ($zip->open($archive) !== true) throw new RuntimeException('GitHub leverde geen geldig updatearchief.');
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_contains($name, '../') || str_starts_with($name, '/')) throw new RuntimeException('Ongeldig pad in updatearchief.');
            }
            if (!$zip->extractTo($stage)) throw new RuntimeException('Updatearchief kon niet worden uitgepakt.');
            $zip->close();
            $folders = array_values(array_filter(scandir($stage) ?: [], fn($v) => $v !== '.' && $v !== '..'));
            $source = count($folders) === 1 ? $stage . '/' . $folders[0] : '';
            $remote = json_decode((string)@file_get_contents($source . '/version.json'), true);
            $local = json_decode((string)@file_get_contents($root . '/version.json'), true);
            if (!is_dir($source) || empty($remote['version']) || version_compare($remote['version'], $local['version'] ?? '0.0.0', '<=')) {
                throw new RuntimeException('Er is geen nieuwere, geldige versie beschikbaar.');
            }
            self::backup($root, $storage);
            foreach (['public', 'src', '.htaccess', 'README.md', 'version.json', 'releases.json'] as $item) {
                $from = $source . '/' . $item;
                if (!file_exists($from)) continue;
                self::copy($from, $root . '/' . $item);
            }
            return 'Versie ' . $remote['version'] . ' is geïnstalleerd. Er is eerst een back-up gemaakt.';
        } finally {
            if (is_file($archive)) unlink($archive);
            if (is_dir($stage)) self::remove($stage);
        }
    }

    private static function download(string $url, string $target): void
    {
        $handle = curl_init($url);
        $file = fopen($target, 'wb');
        curl_setopt_array($handle, [CURLOPT_FILE => $file, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 45, CURLOPT_USERAGENT => 'MijnMuziekCollectie updater/1.0', CURLOPT_PROTOCOLS => CURLPROTO_HTTPS]);
        $ok = curl_exec($handle); $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle); fclose($file);
        if (!$ok || $status !== 200 || !is_file($target) || filesize($target) < 1000) throw new RuntimeException('De update kon niet veilig via HTTPS worden gedownload.');
    }

    private static function backup(string $root, string $storage): void
    {
        $dir = $storage . '/backups'; if (!is_dir($dir)) mkdir($dir, 0750, true);
        $zip = new ZipArchive(); $file = $dir . '/app-' . gmdate('Ymd-His') . '.zip';
        if ($zip->open($file, ZipArchive::CREATE) !== true) throw new RuntimeException('Back-up kon niet worden gemaakt.');
        foreach (['public', 'src', '.htaccess', 'README.md', 'version.json', 'releases.json'] as $item) self::addToZip($zip, $root . '/' . $item, $item);
        $zip->close();
    }

    private static function addToZip(ZipArchive $zip, string $path, string $local): void
    {
        if (is_file($path)) { $zip->addFile($path, $local); return; }
        if (!is_dir($path)) return;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $file) if ($file->isFile()) $zip->addFile($file->getPathname(), $local . '/' . substr($file->getPathname(), strlen($path) + 1));
    }

    private static function copy(string $from, string $to): void
    {
        if (is_file($from)) { if (!copy($from, $to)) throw new RuntimeException('Bestand kon niet worden vervangen: ' . basename($to)); return; }
        if (!is_dir($to)) mkdir($to, 0755, true);
        foreach (scandir($from) ?: [] as $name) if ($name !== '.' && $name !== '..') self::copy($from . '/' . $name, $to . '/' . $name);
    }

    private static function remove(string $path): void
    {
        foreach (scandir($path) ?: [] as $name) if ($name !== '.' && $name !== '..') { $target = $path . '/' . $name; is_dir($target) ? self::remove($target) : unlink($target); }
        rmdir($path);
    }
}
