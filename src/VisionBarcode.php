<?php
declare(strict_types=1);

final class VisionBarcode
{
    private const KEY_FILE = __DIR__ . '/../storage/openai-api-key.txt';

    public static function configured(): bool { return self::key() !== ''; }

    public static function saveKey(string $key): void
    {
        $key=trim($key);
        if(strlen($key)<20) throw new RuntimeException('Dit lijkt geen geldige OpenAI API-sleutel.');
        if(file_put_contents(self::KEY_FILE,$key."\n",LOCK_EX)===false) throw new RuntimeException('De API-sleutel kon niet veilig worden opgeslagen.');
        @chmod(self::KEY_FILE,0600);
    }

    public static function removeKey(): void { if(is_file(self::KEY_FILE) && !unlink(self::KEY_FILE)) throw new RuntimeException('De opgeslagen API-sleutel kon niet worden verwijderd.'); }

    public static function read(string $file): string
    {
        $key = self::key();
        if ($key === '') throw new RuntimeException('Vision-herkenning is nog niet ingesteld. Voeg je OpenAI API-sleutel toe via Integraties.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) throw new RuntimeException('Gebruik een JPG, PNG of WebP-foto.');
        $image = 'data:' . $mime . ';base64,' . base64_encode((string)file_get_contents($file));
        $body = ['model' => getenv('OPENAI_VISION_MODEL') ?: 'gpt-5-nano', 'reasoning' => ['effort' => 'minimal'], 'input' => [['role' => 'user', 'content' => [
            ['type' => 'input_text', 'text' => 'Read the printed barcode digits only. Return one valid EAN, UPC, or GTIN with digits only; otherwise return NONE.'],
            ['type' => 'input_image', 'image_url' => $image, 'detail' => 'low'],
        ]]]];
        $curl = curl_init('https://api.openai.com/v1/responses');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body, JSON_THROW_ON_ERROR), CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25]);
        $response = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
        $data = is_string($response) ? json_decode($response, true) : null;
        if ($status < 200 || $status >= 300 || !is_array($data)) throw new RuntimeException('Vision-herkenning is tijdelijk niet beschikbaar.');
        $text = (string)($data['output'][0]['content'][0]['text'] ?? '');
        $barcode = preg_replace('/\D/', '', $text);
        if (!self::valid($barcode)) throw new RuntimeException('Er konden geen geldige barcodecijfers worden gelezen.');
        return $barcode;
    }

    private static function valid(string $value): bool
    {
        $length = strlen($value); if (!in_array($length, [8, 12, 13, 14], true)) return false;
        $sum = 0; for ($i = 0; $i < $length - 1; $i++) $sum += (int)$value[$i] * ((($length - 2 - $i) % 2 === 0) ? 3 : 1);
        return (10 - ($sum % 10)) % 10 === (int)$value[$length - 1];
    }

    private static function key(): string
    {
        $environment=trim((string)getenv('OPENAI_API_KEY'));
        if($environment!=='')return $environment;
        return is_file(self::KEY_FILE)?trim((string)file_get_contents(self::KEY_FILE)):'';
    }
}
