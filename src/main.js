const USER_NAME = "EdShel";

const FORM_SELECTOR = "#responseform";
const QUESTION_SELECTOR = "#responseform .qtext";
const ANSWERS_CONTAINER_SELECTOR = "#responseform .answer";
const ANSWER_BUTTON_SELECTOR = "#responseform input[name=\"next\"]";

const hubConnection = new signalR.HubConnectionBuilder()
    .withUrl("https://25.86.139.29:5003/tests")
    .build();

hubConnection.on("Answer", function (userName, question, answers) {
    console.log(`${userName} answered ${question} with ${answers}`);

    const myQuestion = getQuestion();
    if (myQuestion !== question) {
        return;
    }

    createAnswerButton(userName, answers);
});

hubConnection.on("Answers", function (json) {
    let answers = JSON.parse(json);
    console.log(answers);
    for (let answer of answers) {
        createAnswerButton(answer.UserName, answer.Answers);
    }
})

document.querySelector(ANSWER_BUTTON_SELECTOR)?.addEventListener('click', function (e) {
    e.preventDefault();

    let serializedForm = serializeAnswers();
    if (!serializeAnswers) {
        return;
    }

    hubConnection.invoke("Answer", USER_NAME, getQuestion(), serializedForm);
});

// Start action

if (getForm() !== null) {
    addToCheckboxesPropertyCalledIsChecked();

    createAnswersContainer();
    hubConnection.start().then(function () {
        hubConnection.invoke("Answers", getQuestion());
    });
}

// DOM access functions

function getForm() {
    return document.querySelector(FORM_SELECTOR);
}

function getQuestion() {
    return document.querySelector(QUESTION_SELECTOR).innerText;
}

// DOM manipulation

function addToCheckboxesPropertyCalledIsChecked() {
    for (let cb of getForm().querySelectorAll("input[type=\"checkbox\"]")) {
        cb.isChecked = cb.checked;
        cb.addEventListener("change", function (e) {
            cb.isChecked = !cb.isChecked;
        });
    }
}

function createAnswersContainer() {
    let element = document.createElement("div");
    element.innerHTML
        = `<b>Answers of other students</b>`
        + `<div id=\"answersContainer\"></div>`;
    getForm().parentNode.append(element);

    let commentContainer = document.createElement("div");

    let commentField = document.createElement("textarea");
    commentField.placeholder = "Type in some comment for this question...";
    commentField.style = "width: 100%";

    let postCommentButton = document.createElement("button");
    postCommentButton.innerText = "Make comment";
    postCommentButton.addEventListener("click", function () {
        hubConnection.invoke("Answer", USER_NAME, getQuestion(), JSON.stringify({
            type: "comment",
            value: commentField.value
        }));
        commentField.value = "";
    });

    commentContainer.appendChild(commentField);
    commentContainer.appendChild(postCommentButton);

    getForm().parentNode.appendChild(commentContainer);
}

function getAnswersContainer() {
    return document.getElementById("answersContainer");
}

function createAnswerButton(userName, answer) {
    let answerObject = JSON.parse(answer);
    if (answerObject.type === "comment") {
        let commentContainer = document.createElement("div");
        commentContainer.innerHTML = `<b>${userName}: </b> ${answerObject.value}`;

        getAnswersContainer().append(commentContainer);
    } else {
        let answerButton = document.createElement("button");
        answerButton.innerHTML = userName;
        answerButton.addEventListener('click', function () {
            deserializeAnswers(answer);
        });

        getAnswersContainer().append(answerButton);
    }
}

// Answer serialize & deserialize

function serializeAnswers() {
    let answersContainer = document.querySelector(ANSWERS_CONTAINER_SELECTOR);
    let inputs = Array.from(answersContainer.getElementsByTagName("input"));
    if (inputs.length === 0) {
        return "";
    }

    let firstInput = inputs[0];
    if (firstInput.type === "radio") {
        return JSON.stringify(serializeRadio(inputs));
    } else if (firstInput.type === "checkbox") {
        return JSON.stringify(serializeCheckboxes(inputs));
    } else {
        return "";
    }
}

function deserializeAnswers(data) {
    let answersContainer = document.querySelector(ANSWERS_CONTAINER_SELECTOR);
    let inputs = Array.from(answersContainer.getElementsByTagName("input"));
    if (inputs.length === 0) {
        return;
    }

    data = JSON.parse(data);
    if (data.type === "radio") {
        deserializeRadio(inputs, data);
    } else if (data.type === "checkbox") {
        deserializeCheckboxes(inputs, data);
    }
}

function serializeRadio(inputs) {
    return { type: "radio", value: getForm()[inputs[0].name].value };
}

function deserializeRadio(inputs, data) {
    getForm()[inputs[0].name].value = data.value;
}

function serializeCheckboxes(inputs) {
    return {
        type: "checkbox",
        value: inputs.map(el => el.isChecked)
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