// Configuração da URL base da API
const API_BASE_URL = 'http://localhost:3000';

// Função para fazer requisições à API
async function fazerRequisicao(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        if (!response.ok) {
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição para ${url}:`, error);
        throw error;
    }
}

// Função para carregar serviços
async function carregarServicos() {
    try {
        const servicos = await fazerRequisicao('/api/servicos');
        const selectServico = document.getElementById('servico');
        servicos.forEach(servico => {
            const option = document.createElement('option');
            option.value = servico.id;
            option.textContent = servico.nome;
            selectServico.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        alert('Ocorreu um erro ao carregar os serviços. Por favor, tente novamente mais tarde.');
    }
}

// Função para carregar avaliações existentes
async function carregarAvaliacoes() {
    try {
        const avaliacoes = await fazerRequisicao('/api/avaliacoes');
        const listaAvaliacoes = document.getElementById('listaAvaliacoes');
        listaAvaliacoes.innerHTML = '';
        avaliacoes.forEach(avaliacao => {
            const avaliacaoElement = document.createElement('div');
            avaliacaoElement.className = 'avaliacao-item';
            avaliacaoElement.innerHTML = `
                <div class="avaliacao-estrelas">${'★'.repeat(avaliacao.estrelas)}${'☆'.repeat(5 - avaliacao.estrelas)}</div>
                <div class="avaliacao-servico">${avaliacao.servico}</div>
                <div class="avaliacao-comentario">${avaliacao.comentario || 'Sem comentário'}</div>
                <div class="avaliacao-usuario">Por: ${avaliacao.usuario}</div>
            `;
            listaAvaliacoes.appendChild(avaliacaoElement);
        });
    } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
        alert('Ocorreu um erro ao carregar as avaliações. Por favor, tente novamente mais tarde.');
    }
}

// Função para enviar uma nova avaliação
async function enviarAvaliacao(event) {
    event.preventDefault();
    const servicoId = document.getElementById('servico').value;
    const estrelas = document.querySelector('input[name="estrelas"]:checked').value;
    const comentario = document.getElementById('comentario').value;

    try {
        await fazerRequisicao('/api/avaliar', 'POST', { servicoId, estrelas, comentario });
        alert('Avaliação enviada com sucesso!');
        document.getElementById('formAvaliacao').reset();
        carregarAvaliacoes(); // Recarrega as avaliações após enviar uma nova
    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        alert('Ocorreu um erro ao enviar sua avaliação. Por favor, tente novamente mais tarde.');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarServicos();
    carregarAvaliacoes();
    document.getElementById('formAvaliacao').addEventListener('submit', enviarAvaliacao);
});