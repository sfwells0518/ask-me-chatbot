import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OpenAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/*async function fetchFactAnswer() {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Who won Wimbledon in 2001?`,
    max_tokens: 60
  });
  console.log(response.data.choices[0].text.trim());
}
fetchFactAnswer();
*/

const chatbotConversation = document.getElementById("chatbot-conversation");

const conversationArr = [{
  role: "system",
  content: "You are a highly knowledgeable assistant that is always happy to help."
}];

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  conversationArr.push({
    role: "user",
    content: "userInput.value"
  });

  const newSpeechBubble = document.getElementById('div');
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursos");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 50);
}
