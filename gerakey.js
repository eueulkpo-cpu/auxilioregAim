async function gerarKey() {
    const  resposta = await fech("http://localhost:3000/gerar-key", {
    meathod: "POST",
    });
    const dados = await resposta.json();

    document.getElementById("keyGerada").textContent = dados.key;
    document.getElementById("resultado").style.display = "block";   
    document.getElementById("status").textContent = "Key gerada com sucesso";
}


        function copiarKey() {

            const key =
                document.getElementById("keyGerada").textContent;

            navigator.clipboard.writeText(key);

            document.getElementById("status").textContent =
                "Key copiada!";
        }

