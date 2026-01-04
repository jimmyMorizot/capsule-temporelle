<?php

declare(strict_types=1);

namespace App\Service;

use DateTimeImmutable;
use RuntimeException;

final class CapsuleService
{
    private const CAPSULE_FILE = 'var/data/capsule.json';

    public function __construct(
        private readonly string $projectDir
    ) {
    }

    /**
     * Save a capsule to JSON file storage
     */
    public function saveCapsule(string $message, DateTimeImmutable $unlockDate): void
    {
        $this->ensureDataDirectoryExists();

        $capsule = [
            'message' => $message,
            'unlockDate' => $unlockDate->format(DateTimeImmutable::ATOM),
            'createdAt' => (new DateTimeImmutable())->format(DateTimeImmutable::ATOM),
        ];

        $filePath = $this->getFilePath();
        $json = json_encode($capsule, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);

        if (file_put_contents($filePath, $json) === false) {
            throw new RuntimeException('Failed to save capsule to file');
        }
    }

    /**
     * Get capsule data from JSON file
     * Returns null if file doesn't exist
     */
    public function getCapsule(): ?array
    {
        $filePath = $this->getFilePath();

        if (!file_exists($filePath)) {
            return null;
        }

        $content = file_get_contents($filePath);
        if ($content === false) {
            throw new RuntimeException('Failed to read capsule file');
        }

        try {
            $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new RuntimeException('Corrupted JSON in capsule file: ' . $e->getMessage(), 0, $e);
        }

        return $data;
    }

    /**
     * Check if the capsule is unlocked (unlock date has passed)
     */
    public function isUnlocked(DateTimeImmutable $unlockDate): bool
    {
        $now = new DateTimeImmutable();
        return $now >= $unlockDate;
    }

    /**
     * Get human-readable remaining time until unlock
     * Format: "X jours Y heures Z minutes"
     */
    public function getRemainingTime(DateTimeImmutable $unlockDate): string
    {
        $now = new DateTimeImmutable();
        $interval = $now->diff($unlockDate);

        // If already unlocked, return appropriate message
        if ($now >= $unlockDate) {
            return 'Capsule déverrouillée';
        }

        $parts = [];

        if ($interval->d > 0) {
            $parts[] = $interval->d . ' jour' . ($interval->d > 1 ? 's' : '');
        }

        if ($interval->h > 0) {
            $parts[] = $interval->h . ' heure' . ($interval->h > 1 ? 's' : '');
        }

        if ($interval->i > 0 || empty($parts)) {
            $parts[] = $interval->i . ' minute' . ($interval->i > 1 ? 's' : '');
        }

        return implode(' ', $parts);
    }

    /**
     * Ensure var/data/ directory exists
     */
    private function ensureDataDirectoryExists(): void
    {
        $dataDir = dirname($this->getFilePath());

        if (!is_dir($dataDir)) {
            if (!mkdir($dataDir, 0755, true) && !is_dir($dataDir)) {
                throw new RuntimeException(sprintf('Failed to create directory "%s"', $dataDir));
            }
        }
    }

    /**
     * Delete the current capsule
     */
    public function deleteCapsule(): void
    {
        $filePath = $this->getFilePath();

        if (file_exists($filePath)) {
            if (!unlink($filePath)) {
                throw new RuntimeException('Failed to delete capsule file');
            }
        }
    }

    /**
     * Get full file path to capsule.json
     */
    private function getFilePath(): string
    {
        return $this->projectDir . '/' . self::CAPSULE_FILE;
    }
}
