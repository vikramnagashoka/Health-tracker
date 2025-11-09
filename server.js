const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

app.post('/api/estimate-calories', async (req, res) => {
  try {
    const { meals } = req.body;

    if (!meals || Object.keys(meals).length === 0) {
      return res.json({ calories: {}, totalCalories: 0 });
    }

    const mealEntries = Object.entries(meals)
      .filter(([_, data]) => data.food && data.food.trim())
      .map(([mealType, data]) => `${mealType}: ${data.food}${data.servingSize ? ` (${data.servingSize})` : ''}`);

    if (mealEntries.length === 0) {
      return res.json({ calories: {}, totalCalories: 0 });
    }

    const prompt = `You are a nutrition expert. Estimate the approximate calories for each meal listed below. 
For each meal, provide a single number representing the total calories.
If serving size is not specified, assume a standard portion.

Meals:
${mealEntries.join('\n')}

Respond in JSON format with this structure:
{
  "breakfast": <number or 0>,
  "lunch": <number or 0>,
  "snack": <number or 0>,
  "dinner": <number or 0>,
  "totalCalories": <sum of all meals>
}

Only include meals that were provided. Be realistic and use typical portion sizes.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a nutrition expert that estimates calories. Always respond with valid JSON only, no additional text.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    const response = completion.choices[0].message.content.trim();
    let calorieData;
    
    try {
      calorieData = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        calorieData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    res.json(calorieData);
  } catch (error) {
    console.error('Error estimating calories:', error);
    res.status(500).json({ 
      error: 'Failed to estimate calories',
      details: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
