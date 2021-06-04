if (!getForm()) {
  throw new Error();
}

const QUESTION = getQuestion();

const hubConnection = new signalR.HubConnectionBuilder()
  .withUrl("https://25.86.139.29:5003/tests")
  .build();

// When someone has answered...
hubConnection.on("Answer", function (userName, question, answers) {
  console.log(`${userName} answered ${question} with ${answers}`);

  if (QUESTION.textWithVariants !== question) {
    return;
  }

  showAnswer(userName, answers);
});

// When the page is loaded and we've asked for all other students answers
hubConnection.on("Answers", function (json) {
  let answers = JSON.parse(json);
  console.log(answers);
  for (let answer of answers) {
    showAnswer(answer.UserName, answer.Answers);
  }
});

// For click on the next question button
const answerButton = document.querySelector('#responseform input[name="next"]');
answerButton?.addEventListener("click", function (e) {
  if (QUESTION.type === "unknown") {
    console.log("Unknown question type.")
    return;
  }

  let serializedForm = serializeAnswers();
  if (!serializeAnswers) {
    console.log("Cannot serialize answers.")
    return;
  }

  hubConnection.invoke(
    "Answer",
    getUserName(),
    getFullQuestionText(),
    serializedForm
  );
});

// Start action
addToCheckboxesPropertyCalledIsChecked();

createAnswersContainer();
createCommentsContainer();

hubConnection.start().then(function () {
  hubConnection.invoke("Answers", getFullQuestionText());
});

// DOM access functions

function getForm() {
  return document.querySelector("#responseform");
}

function getUserName() {
  const userNameSelector = "#page-footer div.logininfo > a:nth-child(1)";
  return document.querySelector(userNameSelector).innerText;
}

function getQuestion() {
  const question = {
    text: getQuestionText(),
    textWithVariants: getFullQuestionText(),
    type: getQuestionType(getVariants()),
    variants: getVariants(),
  };
  return question;
}
function getFullQuestionText() {
  const questionText = getQuestionText();
  const answersTexts = getVariants();
  return `${questionText}\n${answersTexts.map((a) => a.text).join("\n")}`;
}

function getQuestionText() {
  const questionContainer = document.querySelector(
    "#responseform .formulation.clearfix"
  );
  const questionTextContainer = questionContainer.querySelector(".qtext");
  return cleanupText(questionTextContainer.innerText);
}

function getVariants() {
  const questionContainer = document.querySelector(
    "#responseform .formulation.clearfix"
  );
  const answersContainer = questionContainer.querySelector(".answer");
  return Array.from(answersContainer.children)
    .map((answer) => ({
      node: answer,
      text: cleanupText(
        Array.from(answer.querySelectorAll("p"))
          .map((p) => p.innerText)
          .join("")
      ),
      input: answer.querySelector('input:not([type="hidden"])'),
    }))
    .sort((answer) => answer.text);
}

function cleanupText(text) {
  return text
    .replace(/\s/, " ")
    .replace(/\s{2,}/, " ")
    .trim();
}

function getQuestionType(variants) {
  const inputTypes = variants.map((v) => v.input.type);
  const uniqueInputTypes = inputTypes.filter(
    (v, i) => inputTypes.indexOf(v) === i
  );
  if (uniqueInputTypes.length !== 1) {
    return "unknown";
  }
  return String(uniqueInputTypes[0]);
}

// DOM manipulation

function addToCheckboxesPropertyCalledIsChecked() {
  for (let cb of getForm().querySelectorAll('input[type="checkbox"]')) {
    cb.isChecked = cb.checked;
    cb.addEventListener("change", function (e) {
      cb.isChecked = !cb.isChecked;
    });
  }
}

function createAnswersContainer() {
  let element = document.createElement("div");
  element.innerHTML =
    `<b>Answers of other students</b>` + `<div id=\"answersContainer\"></div>`;
  getForm().parentNode.append(element);
}

function createCommentsContainer() {
  let commentContainer = document.createElement("div");

  let commentField = document.createElement("textarea");
  commentField.placeholder = "Type in some comment for this question...";
  commentField.style = "width: 100%";

  let postCommentButton = document.createElement("button");
  postCommentButton.innerText = "Make comment";
  postCommentButton.addEventListener("click", function () {
    hubConnection.invoke(
      "Answer",
      getUserName(),
      QUESTION.textWithVariants,
      JSON.stringify({
        type: "comment",
        value: commentField.value,
      })
    );
    commentField.value = "";
  });

  commentContainer.appendChild(commentField);
  commentContainer.appendChild(postCommentButton);

  getForm().parentNode.appendChild(commentContainer);
}

function getAnswersContainer() {
  return document.getElementById("answersContainer");
}

function showAnswer(userName, answerJson) {
  let answerObject = JSON.parse(answerJson);
  if (answerObject.type === "comment") {
    createComment(userName, answerObject);
  } else {
    createAnswerButton(userName, answerJson);
  }
}

function createComment(userName, answer) {
  let commentContainer = document.createElement("div");
  commentContainer.innerHTML = `<b>${userName}: </b> ${answer.value}`;

  getAnswersContainer().append(commentContainer);
}

function createAnswerButton(userName, answerJson) {
  let answerButton = document.createElement("button");
  answerButton.innerHTML = userName;
  answerButton.addEventListener("click", function () {
    deserializeAnswers(answerJson);
  });

  getAnswersContainer().append(answerButton);
}

// Answer serialize & deserialize

function serializeAnswers() {
  const inputs = QUESTION.variants.map((v) => v.input);

  if (QUESTION.type === "radio") {
    return JSON.stringify(serializeRadio(inputs));
  } else if (QUESTION.type === "checkbox") {
    return JSON.stringify(serializeCheckboxes(inputs));
  } else {
    return "";
  }
}

function deserializeAnswers(data) {
  const inputs = QUESTION.variants.map((v) => v.input);

  data = JSON.parse(data);
  if (data.type === "radio") {
    deserializeRadio(inputs, data);
  } else if (data.type === "checkbox") {
    deserializeCheckboxes(inputs, data);
  }
}

function serializeRadio(inputs) {
  const formValue = getForm()[inputs[0].name].value;
  const radioButtonOrder = inputs.findIndex(
    (input) => input.value === formValue
  );
  return { type: "radio", value: radioButtonOrder };
}

function deserializeRadio(inputs, data) {
  inputs.find((input) => input.value == data.value).click();
}

function serializeCheckboxes(inputs) {
  return {
    type: "checkbox",
    value: inputs.map((el) => el.isChecked),
  };
}

function deserializeCheckboxes(inputs, data) {
  for (let i = 0; i < inputs.length; i++) {
    let checkbox = inputs[i];
    if (checkbox.isChecked !== data.value[i]) {
      checkbox.click();
    }
  }
}
