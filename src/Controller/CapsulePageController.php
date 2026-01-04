<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class CapsulePageController extends AbstractController
{
    /**
     * Main page - Time Capsule Interface
     */
    #[Route('/', name: 'capsule_index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('capsule/index.html.twig');
    }
}
