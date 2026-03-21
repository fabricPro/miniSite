const themeButton = document.getElementById("themeButton");

if (themeButton) {
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light");
    themeButton.textContent = document.body.classList.contains("light")
      ? "Koyu Temaya Don"
      : "Temayi Degistir";
  });
}
