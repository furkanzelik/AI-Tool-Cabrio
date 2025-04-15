import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { AzureChatOpenAI } from '@langchain/openai'

config()

const app = express()
const PORT = 3000
const WEATHER_API_KEY = process.env.WEATHER_API_KEY

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


const model = new AzureChatOpenAI({
  temperature: 0.3,
  maxTokens: 200
})


app.post('/', async (req, res) => {
  const userPrompt = req.body.prompt
  const location = req.body.location || 'Amsterdam'

  if (!userPrompt) {
    return res.status(400).json({ error: 'Prompt ontbreekt.' })
  }

  try {
    const weatherData = await getWeather(location)
    const engineeredPrompt = buildPrompt(userPrompt, weatherData)

    const response = await model.invoke([
      {
        role: 'system',
        content: `Je bent een cabrio-advies expert. Beantwoord de gebruiker of ze vandaag comfortabel met een cabrio kunnen rijden, en geef kledingadvies op basis van de weersomstandigheden.`
      },
      {
        role: 'user',
        content: engineeredPrompt
      }
    ])

    res.json({ message: response.content })

  } catch (error) {
    console.error("❌ Fout bij ophalen of verwerken:", error.message)
    res.status(500).json({ error: 'Advies kon niet worden opgehaald. Probeer later opnieuw.' })
  }
})


async function getWeather(location) {
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${location}&aqi=no`

  const response = await fetch(url)

  
  const raw = await response.text()
  if (!response.ok) {
    console.warn("⚠️ WeatherAPI response:", raw)
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


function buildPrompt(userPrompt, weather) {
  return `
Weersituatie in ${weather.location}:
- Temperatuur: ${weather.temp}°C
- Conditie: ${weather.condition}
- Neerslag: ${weather.rain} mm
- Wind: ${weather.wind} km/h
- Daglicht: ${weather.is_day ? 'ja' : 'nee'}

Vraag van gebruiker:
"${userPrompt}"

Beoordeel of cabriorijden geschikt is vandaag, gebaseerd op temperatuur, regen en daglicht.
Geef een kort, realistisch advies dat past bij een ontspannen rit in een cabrio.
Vermijd overdreven aanbevelingen zoals dikke jassen, sjaals of handschoenen als het daar geen reden voor is.
`.trim()
}

// Start de server
app.listen(PORT, () => {
  console.log(`🚀 Server draait op http://localhost:${PORT}`)
})