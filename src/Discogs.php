<?php
declare(strict_types=1);

final class Discogs
{
    private const KEY_FILE = __DIR__ . '/../storage/discogs-api-token.txt';

    public static function configured(): bool { return self::token() !== ''; }
    public static function token(): string
    {
        $environment=trim((string)getenv('DISCOGS_TOKEN'));
        if($environment!=='')return $environment;
        return is_file(self::KEY_FILE)?trim((string)file_get_contents(self::KEY_FILE)):'';
    }
    public static function saveToken(string $token): void
    {
        $token=trim($token);
        if(strlen($token)<10)throw new RuntimeException('Dit lijkt geen geldige Discogs-token.');
        if(file_put_contents(self::KEY_FILE,$token."\n",LOCK_EX)===false)throw new RuntimeException('De Discogs-token kon niet veilig worden opgeslagen.');
        @chmod(self::KEY_FILE,0600);
    }
    public static function removeToken(): void { if(is_file(self::KEY_FILE)&&!unlink(self::KEY_FILE))throw new RuntimeException('De opgeslagen Discogs-token kon niet worden verwijderd.'); }
}
