

const form = document.querySelector('form')
const chatfield = document.getElementById('chatfield')
const responseArea = document.getElementById('responseArea')
const submitBtn = document.getElementById('submitBtn')
const citySelect = document.getElementById('citySelect')

let messages = JSON.parse(localStorage.getItem('myChatHistory') || '[]')

form.addEventListener('submit', askQuestion)

async function askQuestion(e) {
    e.preventDefault()

    const prompt = chatfield.value
    const location = citySelect ? citySelect.value : '' // optionele stad

    if (!prompt) return

    submitBtn.disabled = true
    responseArea.textContent = location
        ? `Weeradvies ophalen voor ${location}...`
        : `Advies wordt opgehaald...`
    responseArea.scrollIntoView({ behavior: 'smooth' })

    console.log('sending ', { prompt, location })

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt,
            location
        })
    }

    try {
        // Belangrijk: geen localhost maar de serverless route
        const response = await fetch('/api/chat', options)
        const data = await response.json()

        if (response.ok && data.message) {
            responseArea.textContent = data.message
            messages.push(['assistant', data.message])
            // localStorage.setItem('myChatHistory', JSON.stringify(messages))
        } else {
            responseArea.textContent = data.error || 'Er ging iets mis'
            console.error('Server error:', data.error)
        }
    } catch (err) {
        responseArea.textContent = 'Fout bij ophalen advies.'
        console.error(err)
    } finally {
        submitBtn.disabled = false
        chatfield.value = ''
    }
}