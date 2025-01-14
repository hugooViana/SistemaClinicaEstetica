// Configuração da URL base da API
const API_BASE_URL = 'http://localhost:3000';

// Variáveis globais
let dataAtual = new Date();
let dataSelecionada = null;
let consultasSelecionadas = [];
let diasIndisponiveis = [];

// Função para formatar data para o formato brasileiro
function formatarData(data) {
    return data.toLocaleDateString('pt-BR');
}

// Função para fazer requisições à API
async function fazerRequisicao(url, metodo = 'GET', dados = null) {
    const options = {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    };

    if (dados) {
        options.body = JSON.stringify(dados);
    }

    try {
        console.log(`Fazendo requisição para ${url}`, options);
        const response = await fetch(`${API_BASE_URL}${url}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Resposta de erro do servidor:', errorData);
            throw new Error(errorData.message || `Erro na requisição: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Resposta do servidor:', responseData);
        return responseData;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// Função para carregar consultas do banco de dados
async function carregarConsultas() {
    try {
        const consultas = await fazerRequisicao('/consultas');
        consultasSelecionadas = consultas;
        return consultas;
    } catch (error) {
        console.error('Erro ao carregar consultas:', error);
        return [];
    }
}

// Função para carregar dias indisponíveis do banco de dados
async function carregarDiasIndisponiveis() {
    try {
        const indisponiveis = await fazerRequisicao('/dias-indisponiveis');
        diasIndisponiveis = indisponiveis;
        return indisponiveis;
    } catch (error) {
        console.error('Erro ao carregar dias indisponíveis:', error);
        return [];
    }
}

// Função para atualizar o título do mês e ano
function atualizarTituloMes() {
    const mesAno = document.getElementById('mes-ano');
    mesAno.textContent = dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

// Função para verificar se uma data está indisponível
function verificarDataIndisponivel(data) {
    return diasIndisponiveis.some(diaInd => 
        new Date(diaInd).toDateString() === data.toDateString()
    );
}

// Função para verificar se uma data tem consulta
function verificarDataTemConsulta(data) {
    return consultasSelecionadas.some(consulta => 
        new Date(consulta.data).toDateString() === data.toDateString()
    );
}

// Função para renderizar o calendário
async function renderizarCalendario() {
    const diasContainer = document.getElementById('dias');
    diasContainer.innerHTML = '';
    
    atualizarTituloMes();
    
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
    
    // Adicionar células vazias para os dias antes do primeiro dia do mês
    for (let i = 0; i < primeiroDia.getDay(); i++) {
        const diaVazio = document.createElement('div');
        diaVazio.className = 'dia vazio';
        diasContainer.appendChild(diaVazio);
    }
    
    // Carregar dados atualizados
    await Promise.all([carregarConsultas(), carregarDiasIndisponiveis()]);
    
    // Adicionar dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const diaElement = document.createElement('div');
        diaElement.textContent = dia;
        diaElement.className = 'dia';
        
        const dataAtualDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dia);
        
        if (verificarDataIndisponivel(dataAtualDia)) {
            diaElement.classList.add('indisponivel');
        }
        
        if (verificarDataTemConsulta(dataAtualDia)) {
            diaElement.classList.add('tem-consulta');
        }
        
        diaElement.addEventListener('click', () => selecionarDia(dataAtualDia, diaElement));
        diasContainer.appendChild(diaElement);
    }
}

// Função para selecionar um dia
function selecionarDia(data, element) {
    // Remover seleção anterior
    document.querySelectorAll('.dia').forEach(dia => dia.classList.remove('selecionado'));
    
    // Adicionar nova seleção
    element.classList.add('selecionado');
    dataSelecionada = data;
    
    // Atualizar campo de data no formulário
    const dataConsulta = document.getElementById('dataConsulta');
    if (dataConsulta) {
        dataConsulta.value = data.toISOString().split('T')[0];
    }
    
    // Mostrar/esconder botão de marcar como disponível
    const btnMarcarDisponivel = document.getElementById('marcarDisponivel');
    if (btnMarcarDisponivel) {
        btnMarcarDisponivel.style.display = element.classList.contains('indisponivel') ? 'block' : 'none';
    }
    
    // Atualizar lista de consultas do dia
    mostrarConsultasDoDia(data);
}

// Função para mostrar consultas do dia selecionado
function mostrarConsultasDoDia(data) {
    const consultasContainer = document.getElementById('consultas');
    if (!consultasContainer) return;
    
    const consultasDoDia = consultasSelecionadas.filter(consulta => 
        new Date(consulta.data).toDateString() === data.toDateString()
    );
    
    consultasContainer.innerHTML = '';
    
    if (consultasDoDia.length === 0) {
        consultasContainer.innerHTML = '<p>Nenhuma consulta agendada para este dia.</p>';
        return;
    }
    
    consultasDoDia.forEach(consulta => {
        const consultaElement = document.createElement('div');
        consultaElement.className = 'consulta';
        consultaElement.innerHTML = `
            <p><strong>Horário:</strong> ${consulta.horario}</p>
            <p><strong>Cliente:</strong> ${consulta.nome}</p>
            <p><strong>Serviço:</strong> ${consulta.servico}</p>
            <button onclick="desmarcarConsulta(${consulta.id})">Desmarcar</button>
        `;
        consultasContainer.appendChild(consultaElement);
    });
}

// Função para agendar consulta
async function agendarConsulta(event) {
    event.preventDefault();
    
    const form = event.target;
    const novaConsulta = {
        nome: form.nomeCliente.value,
        data: form.dataConsulta.value,
        horario: form.horarioConsulta.value,
        servico: form.servico.value
    };
    
    try {
        console.log('Enviando dados para agendar consulta:', novaConsulta);
        const resposta = await fazerRequisicao('/api/agendar-consulta', 'POST', novaConsulta);
        console.log('Resposta do servidor:', resposta);
        alert('Consulta agendada com sucesso!');
        await renderizarCalendario();
        form.reset();
    } catch (error) {
        console.error('Erro ao agendar consulta:', error);
        console.error('Detalhes do erro:', error.message);
        alert(`Erro ao agendar consulta: ${error.message}. Por favor, tente novamente.`);
    }
}

// Função para definir dia como indisponível
async function definirDiaIndisponivel(event) {
    event.preventDefault();
    
    const form = event.target;
    const data = form.dataIndisponivel.value;
    
    try {
        await fazerRequisicao('/definir-dia-indisponivel', 'POST', { data });
        alert('Dia definido como indisponível com sucesso!');
        await renderizarCalendario();
        form.reset();
    } catch (error) {
        console.error('Erro ao definir dia indisponível:', error);
        alert('Erro ao definir dia indisponível. Por favor, tente novamente.');
    }
}

// Função para desmarcar consulta
async function desmarcarConsulta(id) {
    if (!confirm('Tem certeza que deseja desmarcar esta consulta?')) {
        return;
    }
    
    try {
        await fazerRequisicao(`/api/desmarcar-consulta/${id}`, 'DELETE');
        alert('Consulta desmarcada com sucesso!');
        await renderizarCalendario();
    } catch (error) {
        console.error('Erro ao desmarcar consulta:', error);
        alert('Erro ao desmarcar consulta. Por favor, tente novamente.');
    }
}

// Função para marcar dia como disponível
async function marcarComoDisponivel() {
    if (!dataSelecionada) return;
    
    try {
        await fazerRequisicao('/api/marcar-como-disponivel', 'POST', {
            data: dataSelecionada.toISOString().split('T')[0]
        });
        alert('Dia marcado como disponível com sucesso!');
        await renderizarCalendario();
    } catch (error) {
        console.error('Erro ao marcar dia como disponível:', error);
        alert('Erro ao marcar dia como disponível. Por favor, tente novamente.');
    }
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Configurar navegação do calendário
    document.getElementById('mes-anterior').addEventListener('click', () => {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        renderizarCalendario();
    });
    
    document.getElementById('proximo-mes').addEventListener('click', () => {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        renderizarCalendario();
    });
    
    // Configurar formulários
    const formAgendarConsulta = document.getElementById('agendarConsultaForm');
    if (formAgendarConsulta) {
        formAgendarConsulta.addEventListener('submit', agendarConsulta);
    }
    
    const formDefinirIndisponivel = document.getElementById('definirIndisponivelForm');
    if (formDefinirIndisponivel) {
        formDefinirIndisponivel.addEventListener('submit', definirDiaIndisponivel);
    }
    
    const btnMarcarDisponivel = document.getElementById('marcarDisponivel');
    if (btnMarcarDisponivel) {
        btnMarcarDisponivel.addEventListener('click', marcarComoDisponivel);
    }
    
    // Renderizar calendário inicial
    renderizarCalendario();
});

