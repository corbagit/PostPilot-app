# PostPilot Template Library

This directory contains a rich collection of 60+ platform-optimized social media templates organized by industry. These templates are designed to be used by the PostPilot content generation engine to produce high-quality, engaging posts for our users.

## Structure

Each file in this directory follows a consistent structure for each platform (Instagram, LinkedIn, Twitter/X):

- **Template Name:** A unique identifier (e.g., `SAAS_IG_1`).
- **Hook:** A compelling opening line to grab attention.
- **Body:** The core content structure or main message.
- **CTA:** A clear call-to-action tailored to the platform and goal.
- **Visual:** Specific recommendations for images, videos, or graphics.

## Available Industry Modules

| Industry | File | Templates |
| :--- | :--- | :--- |
| **SaaS & Tech** | `saas-tech.md` | 9 |
| **Fitness & Health** | `fitness-health.md` | 9 |
| **Real Estate** | `real-estate.md` | 9 |
| **Coaching & Consulting** | `coaching-consulting.md` | 9 |
| **E-commerce & Retail** | `e-commerce.md` | 9 |
| **Creative Agencies** | `creative-agencies.md` | 9 |
| **Local Business** | `local-business.md` | 9 |

## Usage Guidelines

1. **Generation:** When a user selects their industry, the backend should pull from the corresponding template file.
2. **Customization:** The AI should replace placeholders (e.g., `[Product Name]`, `[Problem]`) with the user's specific "seed" idea.
3. **Multi-Platform:** For each "seed", one template from each platform should be selected to create a cross-platform content week.
4. **Visuals:** The "Visual" field should be used to generate image prompts for the image generation engine or to guide the user on what photo to upload.

## Total Templates: 63
