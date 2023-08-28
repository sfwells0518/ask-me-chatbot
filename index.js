import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";
import {  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,} from 'firebase/auth';


const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OpenAI_API_KEY,
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_Firebase_API_KEY,
  authDomain: "askme-openai.firebaseapp.com",
  databaseURL: "https://askme-openai-default-rtdb.firebaseio.com",
  projectId: "askme-openai",
  storageBucket: "askme-openai.appspot.com",
  messagingSenderId: "490077676557",
  appId: "1:490077676557:web:e4b0a3ed202c6bd408e144",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const userEmail = document.querySelector("#userEmail");
const userPassword = document.querySelector("#userPassword");
const authForm = document.querySelector("#authForm");
const signUpButton = document.querySelector("#signUpButton");
const signInButton = document.querySelector("#signInButton");
const signOutButton = document.querySelector("#signOutButton");
const newBMain = document.querySelector(".layout-container");
const userAuthContainer = document.querySelector(".userAuth-container");
const welcomeContainer = document.querySelector(".welcome-container");

const userSignUp = async () => {
  const signUpEmail = userEmail.value;
  const signUpPassword = userPassword.value;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
    const user = userCredential.user;
    console.log(user);
    alert("Welcome to NewB! Your account has successfully been created!");
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorCode + errorMessage);
  }
};

const userSignIn = async () => {
  const signInEmail = userEmail.value;
  const signInPassword = userPassword.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
    const user = userCredential.user;
    console.log(user);
    alert("Welcome to NewB! You have logged in successfully!");
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorCode + errorMessage);
  }
};

const checkAuthState = async () => {
  onAuthStateChanged(auth, user => {
    if (user) {
      /* User is signed in */
      authForm.style.display = "none";
      userAuthContainer.style.display = "none";
      welcomeContainer.style.display = "none";
      signOutButton.style.display = "block";
      newBMain.style.display = "flex";

      
    } else {
      /* No user is signed in */
      userAuthContainer.style.display = "flex";
      authForm.style.display = "block";
      welcomeContainer.style.display = "flex";
      signOutButton.style.display = "none";
      newBMain.style.display = "none";
    }
  });
};

const userSignOut = async () => {
  await signOut(auth);
};

checkAuthState();

signUpButton.addEventListener("click", userSignUp,);
signInButton.addEventListener("click", userSignIn);
signOutButton.addEventListener("click", userSignOut);

const database = getDatabase(app);

const conversationInDb = ref(database);

const openai = new OpenAIApi(configuration);

const chatbotConversation = document.getElementById("chatbot-conversation");

const instructionObj = {
  role: "system",
  content:
    "You are both a pediatrician and a parent. Engage in a back-and-forth conversation with the user, paying close attention to the user's questions and context. Offer warm, actionable and concise advice in 50 words or less, ensuring your responses are relevant to the user's query.",
};

const userInput = document.getElementById("user-input");
const suggestionButtons = document.querySelector(".suggested-prompts");
const promptToggle = document.getElementById("prompt-toggle");
const clearButton = document.getElementById("clear-btn");

userInput.addEventListener("input", () => {
  const trimmedInput = userInput.value.trim();

  if (trimmedInput !== "") {
    suggestionButtons.style.display = "none";
    promptToggle.style.display = "none";
  } else {
    suggestionButtons.style.display = "grid";
    promptToggle.style.display = "flex";
  }
});

function resetConversation() {
  chatbotConversation.innerHTML = "";
  userInput.value = "";
  suggestionButtons.style.display = "grid";
  promptToggle.style.display = "flex";
}

clearButton.addEventListener("click", () => {
  // Reset the conversation
  resetConversation();
  // Additional operations
  remove(conversationInDb);
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    role: "user",
    content: userInput.value,
  });
  fetchReply();
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);
      const prompt = JSON.stringify(conversationArr);
      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3,
      });
      push(conversationInDb, response.data.choices[0].message);
      renderTypewriterText(response.data.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);

  let i = 0;
  function animate() {
    newSpeechBubble.textContent = newSpeechBubble.textContent + text.slice(i - 1, i);
    if (text.length === i) {
      newSpeechBubble.classList.remove("blinking-cursor");
      return;
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

let suggestionHidden = true; // Initial State

suggestionButtons.style.opacity = "0";
suggestionButtons.style.transform = "translateX(-50%) translateY(0)";
suggestionButtons.style.visibility = "hidden";
promptToggle.style.transform = "translateY(185px)";

const promptToggleText = document.querySelector("#prompt-toggle h5");
promptToggleText.textContent = "Show Suggested Prompts";

const hideIcon = document.querySelector(".hide-icon");
const showIcon = document.querySelector(".show-icon");

hideIcon.style.display = "none";
showIcon.style.display = "inline-block";

document.getElementById("prompt-toggle").addEventListener("click", () => {
  if (suggestionHidden) {
    // Show the suggestionButtons
    suggestionButtons.style.opacity = "1";
    suggestionButtons.style.visibility = "visible";
    suggestionButtons.style.transform = "translateX(-50%) translateY(0)";
    suggestionButtons.style.transitionDelay = "0s"; // No delay
    promptToggle.style.transform = "translateY(0)";
    promptToggleText.textContent = "Hide Suggested Prompts";
    hideIcon.style.display = "inline-block";
    showIcon.style.display = "none";
  } else {
    // Hide the suggestionButtons
    suggestionButtons.style.opacity = "0";
    suggestionButtons.style.transform = "translateX(-50%) translateY(100%)"; // Move it downwards
    suggestionButtons.style.transitionDelay = "0s, 0s, 0.3s"; // Delay visibility
    promptToggle.style.transform = "translateY(185px)"; // Move it half the height downwards
    promptToggleText.textContent = "Show Suggested Prompts";
    hideIcon.style.display = "none";
    showIcon.style.display = "inline-block";
    setTimeout(() => {
      suggestionButtons.style.visibility = "hidden"; // Apply visibility hidden after a delay
    }, 300); // This delay should match the transition duration
  }
  suggestionHidden = !suggestionHidden; // Toggle the state
});

function renderConversationFromDb() {
  get(conversationInDb).then((snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add("speech", `speech-${dbObj.role === "user" ? "human" : "ai"}`);
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

      suggestionButtons.style.display = "none";
      promptToggle.style.display = "none";
    } else {
      suggestionButtons.style.display = "grid";
      promptToggle.style.display = "flex";
    }
  });
}
renderConversationFromDb();


// Wrap every letter in a span
const textWrapper = document.querySelector('.ml6 .letters');
textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

anime.timeline({loop: true})
  .add({
    targets: '.ml6 .letter',
    translateY: ["1.1em", 0],
    translateZ: 0,
    duration: 750,
    delay: (el, i) => 50 * i
  }).add({
    targets: '.ml6',
    opacity: 0,
    duration: 1000,
    easing: "easeOutExpo",
    delay: 1000
  });