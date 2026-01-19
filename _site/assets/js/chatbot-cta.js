document.addEventListener('DOMContentLoaded', () => {
    const wrappers = document.querySelectorAll('.chatbot-icon-wrapper');

    // Standardized prompt for all chatbots
    const standardizedPrompt = "Generate a professional summary of Tim Meko, the visual journalist specializing in data visualization and cartography, for a hiring manager, focusing on key skills and experience.";

    // Prompts for each chatbot
    const prompts = {
        chatgpt: standardizedPrompt,
        claude: standardizedPrompt,
        gemini: standardizedPrompt
    };


    // URLs for each chatbot
    const urls = {
        chatgpt: "https://chatgpt.com/",
        claude: "https://claude.ai/",
        gemini: "https://gemini.google.com/"
    };

    wrappers.forEach(wrapper => {
        const button = wrapper.querySelector('.chatbot-icon-button');
        const botType = wrapper.getAttribute('data-chatbot');

        if (button && botType) {
            button.addEventListener('click', async () => {
                const textToCopy = prompts[botType];
                const urlToOpen = urls[botType];

                if (textToCopy) {
                    try {
                        await navigator.clipboard.writeText(textToCopy);

                        // Show toast
                        wrapper.classList.add('show');

                        // Hide after 2 seconds
                        setTimeout(() => {
                            wrapper.classList.remove('show');
                        }, 2000);

                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                    }
                }

                // Open in new tab
                if (urlToOpen) {
                    // Small delay to ensure clipboard action registers first
                    setTimeout(() => {
                        window.open(urlToOpen, '_blank');
                    }, 100);
                }
            });
        }
    });
});
