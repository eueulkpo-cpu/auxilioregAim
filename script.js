document.getElementById("login").addEventListener("click", function() {
    let usuario = document.getElementById("usuario").value;
    let senha = document.getElementById("senha").value;

    if (usuario === "eueu" && senha === "1234") {
        document.getElementById("telalogin").style.display = "none";
        document.getElementById("telaprincipal").style.display = "block";
    } else {
        alert("Usuário ou senha incorretos!");
    }
});