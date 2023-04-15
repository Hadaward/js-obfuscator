const s = document.querySelector("label.score");
const a = document.querySelector("button.add");
const r = document.querySelector("button.remove");

a.addEventListener(
    "click", function() {
        s.textContent = Number(s.textContent) + 1;
    }
);

r.addEventListener(
    "click", function() {
        s.textContent = Number(s.textContent) - 1;
    }
);