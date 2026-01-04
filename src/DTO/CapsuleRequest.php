<?php

declare(strict_types=1);

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

final class CapsuleRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le message ne peut pas être vide')]
        #[Assert\Length(
            min: 1,
            max: 5000,
            minMessage: 'Le message doit contenir au moins {{ limit }} caractère',
            maxMessage: 'Le message ne peut pas dépasser {{ limit }} caractères'
        )]
        public readonly string $message,

        #[Assert\NotBlank(message: 'La date de déverrouillage est obligatoire')]
        #[Assert\Regex(
            pattern: '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/',
            message: 'La date doit être au format ISO 8601 (exemple: 2026-01-10T23:59:00+00:00)'
        )]
        public readonly string $unlockDate,
    ) {
    }

    /**
     * Convert unlockDate string to DateTimeImmutable
     */
    public function getUnlockDateAsDateTime(): \DateTimeImmutable
    {
        return new \DateTimeImmutable($this->unlockDate);
    }
}
