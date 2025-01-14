document.addEventListener('DOMContentLoaded', () => {
    console.log('Página de mensagens carregada');
    carregarMensagens();
    
    // Adicionar listener para o botão de atualização
    const btnAtualizar = document.getElementById('atualizar-mensagens');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', () => {
            console.log('Botão de atualização clicado');
            carregarMensagens();
        });
    }

    // Adicionar botão de teste
    const btnTeste = document.createElement('button');
    btnTeste.textContent = 'Criar Mensagem de Teste';
    btnTeste.onclick = criarMensagemTeste;
    document.body.insertBefore(btnTeste, document.body.firstChild);
});

async function carregarMensagens() {
    try {
        console.log('Iniciando carregamento de mensagens...');
        const response = await fetch('/api/mensagens', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Importante para enviar cookies de sessão
        });

        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const mensagens = await response.json();
        console.log('Mensagens recebidas:', mensagens);
        
        exibirMensagens(mensagens);
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        exibirErro('Erro ao carregar mensagens. Por favor, tente novamente.');
    }
}



function exibirMensagens(mensagens) {
    console.log('Exibindo mensagens:', mensagens);
    const container = document.getElementById('mensagens-container');
    
    if (!container) {
        console.error('Container de mensagens não encontrado!');
        return;
    }

    container.innerHTML = '';

    if (!Array.isArray(mensagens) || mensagens.length === 0) {
        container.innerHTML = '<p class="sem-mensagens">Você não tem nenhuma mensagem.</p>';
        return;
    }

    const mensagensOrdenadas = mensagens.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));

    mensagensOrdenadas.forEach(mensagem => {
        const mensagemElement = document.createElement('div');
        mensagemElement.className = `mensagem mensagem-${mensagem.tipo}`;
        
        // Formatar a data para o padrão brasileiro
        const data = new Date(mensagem.data_criacao).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        mensagemElement.innerHTML = `
            <div class="mensagem-conteudo">
                <p class="mensagem-texto">${mensagem.conteudo}</p>
                <p class="mensagem-data">Recebida em: ${data}</p>
            </div>
        `;
        container.appendChild(mensagemElement);
    });
}

function exibirErro(mensagem) {
    const container = document.getElementById('mensagens-container');
    if (container) {
        container.innerHTML = `<p class="erro">${mensagem}</p>`;
    }
}

