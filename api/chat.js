// api/chat.js - Vercel serverless function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Get API key from environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Cricket-focused system prompt
        const systemPrompt = `You are a cricket expert AI assistant. You have comprehensive knowledge about:
- Cricket players, statistics, and records
- Tournament results (IPL, World Cup, T20 leagues, etc.)
- Live cricket scores and match updates
- Cricket rules, formats, and regulations
- Historical cricket data and trivia
- Team comparisons and analysis

Guidelines:
- Always respond with accurate, up-to-date cricket information
- Be enthusiastic and knowledgeable about cricket
- If asked about non-cricket topics, politely redirect to cricket
- Use cricket emojis (🏏) occasionally to maintain the theme
- Keep responses informative but conversational
- If you don't know current live scores, direct users to official sources

Current context: You are integrated into a cricket chatbot with a beautiful blue gradient UI.`;
        
        // Prepare the request to Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: systemPrompt + "\n\nUser question: " + message
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
        
        // Make request to Gemini API
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return res.status(500).json({ 
                error: 'Failed to get response from AI service',
                details: response.status === 429 ? 'Rate limit exceeded' : 'Service unavailable'
            });
        }
        
        const data = await response.json();
        
        // Extract the response text
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ response: aiResponse });
        } else {
            console.error('Unexpected API response structure:', data);
            return res.status(500).json({ error: 'Invalid response from AI service' });
        }
        
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
