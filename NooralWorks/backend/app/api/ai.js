const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../core/auth');

router.post('/summarize-logs', authenticateToken, async (req, res) => {
  const { logs } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is missing in your .env file. Please add your Google Gemini API key to use AI features.' 
    });
  }

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of logs to summarize.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Format logs for the prompt
    let logsText = logs.map(l => `Date: ${l.date}\nStatus: ${l.status}\nComments/Notes: ${l.comments || 'None'}\nFeedback Received: ${l.feedback || 'None'}`).join('\n---\n');

    const prompt = `You are an AI assistant designed to summarize weekly/monthly daily logs for interns.
Read the following daily logs and provide a concise, professional performance summary for the Team Lead. 
Highlight blockers, achievements, and general consistency. Format it in bullet points. Do not include introductory text, just the summary.

Logs:
${logsText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ summary: text });
  } catch (error) {
    console.error('AI Summarization Error:', error);
    res.status(500).json({ error: 'Failed to generate AI summary.' });
  }
});

module.exports = router;
