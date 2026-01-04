<?php

declare(strict_types=1);

namespace App\Controller;

use App\DTO\CapsuleRequest;
use App\Service\CapsuleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/capsule', name: 'api_capsule_')]
final class CapsuleController extends AbstractController
{
    public function __construct(
        private readonly CapsuleService $capsuleService,
        private readonly ValidatorInterface $validator
    ) {
    }

    /**
     * Create or update a time capsule
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $content = $request->getContent();
        $data = json_decode($content, true);

        if ($data === null || json_last_error() !== JSON_ERROR_NONE) {
            return $this->json([
                'status' => 'error',
                'message' => 'Invalid JSON: ' . json_last_error_msg(),
                'received' => $content,
            ], Response::HTTP_BAD_REQUEST);
        }

        $capsuleRequest = new CapsuleRequest(
            message: $data['message'] ?? '',
            unlockDate: $data['unlockDate'] ?? ''
        );

        // Validate manually
        $errors = $this->validator->validate($capsuleRequest);
        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }
            return $this->json([
                'status' => 'error',
                'errors' => $errorMessages,
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if date is in the future
        $unlockDateTime = $capsuleRequest->getUnlockDateAsDateTime();
        if ($unlockDateTime <= new \DateTimeImmutable()) {
            return $this->json([
                'status' => 'error',
                'errors' => ['unlockDate' => 'La date de déverrouillage doit être dans le futur'],
            ], Response::HTTP_BAD_REQUEST);
        }

        $this->capsuleService->saveCapsule(
            $capsuleRequest->message,
            $unlockDateTime
        );

        return $this->json([
            'status' => 'success',
            'message' => 'Capsule créée avec succès',
            'unlockDate' => $capsuleRequest->unlockDate,
        ], Response::HTTP_CREATED);
    }

    /**
     * Retrieve the time capsule (if unlocked)
     */
    #[Route('', name: 'get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        $capsule = $this->capsuleService->getCapsule();

        if ($capsule === null) {
            return $this->json([
                'status' => 'error',
                'message' => 'Aucune capsule trouvée',
            ], Response::HTTP_NOT_FOUND);
        }

        $unlockDate = new \DateTimeImmutable($capsule['unlockDate']);

        // Check if capsule is locked
        if (!$this->capsuleService->isUnlocked($unlockDate)) {
            $remainingTime = $this->capsuleService->getRemainingTime($unlockDate);

            return $this->json([
                'status' => 'locked',
                'message' => sprintf('Capsule verrouillée. Déverrouillage dans %s', $remainingTime),
                'unlockDate' => $capsule['unlockDate'],
            ], Response::HTTP_FORBIDDEN);
        }

        // Capsule is unlocked, return content
        return $this->json([
            'status' => 'unlocked',
            'message' => $capsule['message'],
            'unlockDate' => $capsule['unlockDate'],
            'createdAt' => $capsule['createdAt'],
        ], Response::HTTP_OK);
    }
}
