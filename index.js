import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get, remove, onValue } from "firebase/database";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";

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

const database = getDatabase(app);

let userConversationsRef = null;
let currentConversationID = null;

const userEmail = document.querySelector("#userEmail");
const userPassword = document.querySelector("#userPassword");
const userNameInput = document.getElementById("userName");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector(".auth-title h1");
const signUpButton = document.querySelector("#signUpButton");
const signInButton = document.querySelector("#signInButton");
const signOutButton = document.querySelector("#signOutButton");
const newBMain = document.querySelector(".layout-container");
newBMain.style.display = "none";
const userAuthContainer = document.querySelector(".userAuth-container");
const welcomeContainer = document.querySelector(".welcome-container");
let justSignedUp = false;
const signUpLink = document.querySelector(".signup-link");
const authAltContainerH4 = document.querySelector(".auth-alt-container h4");
const logInLink = document.querySelector(".login-link");
const chatHistoryList = document.getElementById("chat-history-list");

function openAuth(action) {
  // Depending on the action, show the corresponding form/content
  if (action === "login") {
    // display login form/content
    userNameInput.style.display = "none";
    signUpButton.style.display = "none";
    signInButton.style.display = "block";
    authTitle.innerHTML = "Welcome Back, Newbie";
    authAltContainerH4.innerHTML = 'Need an account? <a class="signup-link">Sign Up</a>';
  } else if (action === "signup") {
    // display signup form/content
    userNameInput.style.display = "block";
    signUpButton.style.display = "block";
    signInButton.style.display = "none";
    authTitle.innerHTML = "Create Account";
    authAltContainerH4.innerHTML = 'Already have an account? <a class="login-link">Log In</a>';
  }
}

authAltContainerH4.addEventListener("click", function (e) {
  if (e.target.classList.contains("login-link")) {
    e.preventDefault();
    openAuth("login");
  } else if (e.target.classList.contains("signup-link")) {
    e.preventDefault();
    openAuth("signup");
  }
});

const showLoggedInUI = () => {
  authForm.style.display = "none";
  userAuthContainer.style.display = "none";
  welcomeContainer.style.display = "none";
  signOutButton.style.display = "block";
  newBMain.style.display = "flex";
};

const showLoggedOutUI = () => {
  userAuthContainer.style.display = "flex";
  authForm.style.display = "flex";
  welcomeContainer.style.display = "flex";
  newBMain.style.display = "none";
  signOutButton.style.display = "none";
};

const routes = {
  "/": showLoggedOutUI,
  "/chat": showLoggedInUI,
};

const userSignUp = async () => {
  const signUpEmail = userEmail.value;
  const signUpPassword = userPassword.value;
  const userNameInput = document.getElementById("userName");
  const displayName = userNameInput.value;

  try {
    justSignedUp = true;
    const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
    const user = userCredential.user;

    await updateProfile(user, { displayName: displayName });

    await signOut(auth);
    justSignedUp = false;
    showLoggedOutUI();

    setTimeout(() => {
      alert("Welcome to NewB, " + displayName + "! Your account has successfully been created!");
    }, 500);

    authTitle.innerHTML = "Welcome, Newbie!";
    userNameInput.style.display = "none";
    signUpButton.style.display = "none";
    signInButton.style.display = "block";
  } catch (error) {
    justSignedUp = false;
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error(errorCode, errorMessage);
    alert("Whoops! There was an issue creating your account. Please try again!");
  }
};

const userSignIn = async () => {
  const signInEmail = userEmail.value;
  const signInPassword = userPassword.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
    const user = userCredential.user;
    showLoggedInUI();
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error(errorCode, errorMessage);
    showLoggedOutUI();
    alert("Failed to sign in. Please try again.");
  }
};

function setupRealtimeListener() {
  if (userConversationsRef) {
    onValue(userConversationsRef, (snapshot) => {
      renderConversationFromDb(snapshot);
    });
  }
}

const checkAuthState = () => {
  onAuthStateChanged(auth, (user) => {
    console.log("onAuthStateChanged triggered", user);

    if (user && user.uid && !justSignedUp) {
      userConversationsRef = ref(database, "users/" + user.uid + "/conversations");

      setupRealtimeListener();

      loadChatHistory();

      window.location.hash = "chat";
      showLoggedInUI();
    } else {
      userConversationsRef = null;

      window.location.hash = "";
      showLoggedOutUI();
    }
  });
};
checkAuthState();

document.querySelector(".show-icon-auth").addEventListener("click", function () {
  const passwordInput = document.getElementById("userPassword");
  const showIcon = document.querySelector(".show-icon-auth");
  const hideIcon = document.querySelector(".hide-icon-auth");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    showIcon.style.display = "none";
    hideIcon.style.display = "block";
  } else {
    passwordInput.type = "password";
    showIcon.style.display = "block";
    hideIcon.style.display = "none";
  }
});

document.querySelector(".hide-icon-auth").addEventListener("click", function () {
  const passwordInput = document.getElementById("userPassword");
  const showIcon = document.querySelector(".show-icon-auth");
  const hideIcon = document.querySelector(".hide-icon-auth");

  passwordInput.type = "password";
  showIcon.style.display = "block";
  hideIcon.style.display = "none";
});

const userSignOut = async () => {
  await signOut(auth);
  showLoggedOutUI();
};

checkAuthState();

if (signUpButton) {
  signUpButton.addEventListener("click", userSignUp);
}

if (signInButton) {
  signInButton.addEventListener("click", userSignIn);
}

if (signOutButton) {
  signOutButton.addEventListener("click", userSignOut);
}

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
  const starterMessage = document.createElement("div");
  starterMessage.className = "speech speech-ai";
  starterMessage.innerHTML = "<h4>Hey, newbie parent! What can I help you with today?</h4>";
  chatbotConversation.appendChild(starterMessage);
  userInput.value = "";
  suggestionButtons.style.display = "grid";
  promptToggle.style.display = "flex";
}

clearButton.addEventListener("click", () => {
  resetConversation();
  currentConversationID = null;
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!userConversationsRef) {
    console.error("No user specific database references available");
    return;
  }

  if (!currentConversationID) {
    currentConversationID = push(userConversationsRef).key;
  }

  const messageRef = ref(database, `users/${auth.currentUser.uid}/conversations/${currentConversationID}`);
  console.log("Attempting to push user message");
  console.log("User's message:", { role: "user", content: userInput.value });
  push(messageRef, {
    role: "user",
    content: userInput.value,
  });

  loadChatHistory();

  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  if (!userConversationsRef) {
    console.error("No user specific database reference available");
    return;
  }

  get(userConversationsRef).then(async (snapshot) => {
    if (snapshot.exists()) {
      const rawMessages = snapshot.val();
      let conversationArr = [];
      conversationArr.push(instructionObj);
      for (let key in rawMessages) {
        if (rawMessages[key].role && rawMessages[key].content) {
          conversationArr.push({ role: rawMessages[key].role, content: rawMessages[key].content });
        } else {
          for (let innerKey in rawMessages[key]) {
            if (rawMessages[key][innerKey].role && rawMessages[key][innerKey].content) {
              conversationArr.push({
                role: rawMessages[key][innerKey].role,
                content: rawMessages[key][innerKey].content,
              });
            }
          }
        }
      }

      console.log("Entire conversation being sent to OpenAI", JSON.stringify(conversationArr, null, 2));

      console.log("Sending the following payload to OpenAI:", conversationArr);
      const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3,
      });

      const botResponse = response.data.choices[0].message.content.replace(/^(User|Assistant): /, "");
      console.log("Bot response data:", botResponse);
      console.log("Current user UID:", auth.currentUser.uid);
      const responseRef = ref(database, `users/${auth.currentUser.uid}/conversations/${currentConversationID}`);
      push(responseRef, {
        role: "assistant",
        content: botResponse,
      });

      if (chatHistoryList) {
        chatHistoryList.style.display = "block";
      }
      renderTypewriterText(botResponse);
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

let suggestionHidden = true;

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
    suggestionButtons.style.opacity = "1";
    suggestionButtons.style.transform = "translateX(-50%) translateY(30px)";
    suggestionButtons.style.visibility = "visible";
    promptToggle.style.transform = "translateY(0)";
    promptToggleText.textContent = "Hide Suggested Prompts";

    hideIcon.style.display = "inline-block";
    showIcon.style.display = "none";
  } else {
    suggestionButtons.style.opacity = "0";
    suggestionButtons.style.transform = "translateX(-50%) translateY(0)";
    suggestionButtons.style.visibility = "hidden";
    promptToggle.style.transform = "translateY(185px)";
    promptToggleText.textContent = "Show Suggested Prompts";

    hideIcon.style.display = "none";
    showIcon.style.display = "inline-block";
  }
  suggestionHidden = !suggestionHidden;
});

const suggestions = document.querySelectorAll(".suggested-prompts div");
suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    const text = suggestion.textContent;
    userInput.value = text;
    document.querySelector("form").dispatchEvent(new Event("submit"));
  });
});

function loadChatHistory() {
  if (!userConversationsRef) {
    console.error("No user specific database reference available");
    return;
  }

  get(userConversationsRef).then((snapshot) => {
    if (snapshot.exists()) {
      const rawMessages = snapshot.val();
      let conversationArr = [];
      for (let key in rawMessages) {
        if (rawMessages[key].role && rawMessages[key].content) {
          conversationArr.push({ role: rawMessages[key].role, content: rawMessages[key].content });
        } else {
          for (let innerKey in rawMessages[key]) {
            if (rawMessages[key][innerKey].role && rawMessages[key][innerKey].content) {
              conversationArr.push({
                role: rawMessages[key][innerKey].role,
                content: rawMessages[key][innerKey].content,
              });
            }
          }
        }
      }

      console.log("Entire conversation loaded:", JSON.stringify(conversationArr, null, 2));
      renderConversationFromDb(conversationArr);
    } else {
      console.log("No chat data available");
    }
  });
}

function renderConversationFromDb(conversationArr) {
  chatbotConversation.innerHTML = "";

  if (conversationArr.length === 0) {
    resetConversation();
    return;
  }

  conversationArr.forEach((message) => {
    const newSpeechBubble = document.createElement("div");
    newSpeechBubble.classList.add("speech", `speech-${message.role}`);

    if (message.content.includes("\n")) {
      const lines = message.content.split("\n");
      lines.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        newSpeechBubble.appendChild(p);
      });
    } else {
      newSpeechBubble.textContent = message.content;
    }

    chatbotConversation.appendChild(newSpeechBubble);
  });

  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
}
