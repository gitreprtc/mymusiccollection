<?php
declare(strict_types=1);

final class VisionBarcode
{
    private const LEGACY_KEY_FILE = __DIR__ . '/../storage/openai-api-key.txt';

    public static function configured(): bool { return self::key() !== ''; }

    public static function legacyKeyPresent(): bool { return is_file(self::LEGACY_KEY_FILE); }

    public static function removeLegacyKey(): void
    {
        if (is_file(self::LEGACY_KEY_FILE) && !unlink(self::LEGACY_KEY_FILE)) throw new RuntimeException('Het oude sleutelbestand kon niet worden verwijderd.');
    }

    public static function read(string $file): string
    {
        $key = self::key();
        if ($key === '') throw new RuntimeException('Vision-herkenning is nog niet ingesteld. Stel OPENAI_API_KEY in als hosting-omgevingsvariabele.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) throw new RuntimeException('Gebruik een JPG, PNG of WebP-foto.');
        $image = 'data:' . $mime . ';base64,' . base64_encode((string)file_get_contents($file));
        $body = ['model' => getenv('OPENAI_VISION_MODEL') ?: 'gpt-4.1-mini', 'input' => [['role' => 'user', 'content' => [
            ['type' => 'input_text', 'text' => 'Read only the printed digits below the barcode in this image. Return exactly one EAN, UPC, or GTIN number with no spaces, punctuation, or other text. If uncertain, return NONE.'],
            ['type' => 'input_image', 'image_url' => $image, 'detail' => 'high'],
        ]]]];
        $curl = curl_init('https://api.openai.com/v1/responses');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body, JSON_THROW_ON_ERROR), CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 45]);
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
        return trim((string)getenv('OPENAI_API_KEY'));
    }
}
