// api/chat.js
// Doel: Vercel serverless route voor AI + weeradvies (cabrio)

import { config } from 'dotenv'
import { AzureChatOpenAI } from '@langchain/openai'
import { tool } from '@langchain/core/tools'

// In Vercel staan env vars al in process.env; lokaal gebruiken we .env
if (process.env.NODE_ENV !== 'production') {
    config()
}

const WEATHER_API_KEY = process.env.WEATHER_API_KEY

let messages = [[
    'system',
    `Als de gebruiker vraagt om weeradvies voor een cabrio autorit, dan gebruik je de weather tool om het weer op te halen. Let op dat je de userLocation meegeeft aan de weather tool, zodat je de juiste weerdata ophaalt. Als de vraag over iets anders gaat dan geef je gewoon antwoord.`
]]

async function getWeather({ location }) {
    console.log('ophalen weer voor', location)

    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`

    const response = await fetch(url) // Node 18+ heeft global fetch
    const raw = await response.text()

    if (!response.ok) {
        console.warn('⚠️ WeatherAPI response:', raw)
        throw new Error(`Weerdata ophalen mislukt: ${raw}`)
    }

    const data = JSON.parse(raw)

    return {
        location: data.location.name,
        temp: data.current.temp_c,
        condition: data.current.condition.text,
        rain: data.current.precip_mm,
        wind: data.current.wind_kph,
        is_day: data.current.is_day
    }
}

const weather = tool(getWeather, {
    name: 'weather',
    description: 'Haal actuele weerinformatie op voor een specifieke locatie. Geef de naam van de stad op.',
    schema: {
        type: 'object',
        properties: {
            location: { type: 'string' }
        },
        required: ['location']
    }
})

const model = new AzureChatOpenAI({
    temperature: 0.3,
    maxTokens: 200
}).bindTools([weather])

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).json({ error: 'Alleen POST is toegestaan.' })
    }

    const { prompt, location } = req.body ?? {}
    console.log('userPrompt:', prompt)
    console.log('user location:', location)

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt ontbreekt.' })
    }

    try {
        messages.push(['user', prompt])

        const response = await model.invoke(messages)
        messages.push(response)

        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log('ik wil graag deze tool aanroepen:')
            console.log(response.tool_calls)

            const toolsByName = { weather }

            for (const toolCall of response.tool_calls) {
                const selectedTool = toolsByName[toolCall.name]
                console.log('now trying to call ' + toolCall.name)

                const toolMessage = await selectedTool.invoke(toolCall)
                console.log('finished calling the tool')
                console.log(toolMessage)

                messages.push(toolMessage)
            }

            console.log('whole array')
            console.log(messages)

            const finalresult = await model.invoke(messages)
            console.log('final result:', finalresult.content)

            return res.status(200).json({ message: finalresult.content })
        }

        return res.status(200).json({ message: response.content })
    } catch (error) {
        console.error('Fout bij ophalen of verwerken:', error)
        return res.status(500).json({
            error: 'Advies kon niet worden opgehaald. Probeer later opnieuw.'
        })
    }
}