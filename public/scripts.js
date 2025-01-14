// Configuração da URL base da API
const API_BASE_URL = 'http://localhost:3000';

// Variáveis globais
let dataAtual = new Date();
let consultasSelecionadas = [];
let diasIndisponiveis = [];
let consultasAgendadasCompletas = [];
let consultasConcluidasCompletas = [];
const consultasPorPagina = 3;

// Funções de utilidade
function redirecionarParaHome(userType) {
    if (userType === 'usuario') {
        window.location.href = 'home-usuario.html';
    } else if (userType === 'proprietaria') {
        window.location.href = 'home-proprietaria.html';
    }
}

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
            throw new Error(`Erro HTTP! status: ${response.status}, url: ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição para ${url}:`, error);
        throw error;
    }
}

// Carregar dados do usuário
async function carregarDadosUsuario() {
    try {
        const userData = await fazerRequisicao('/user-data');
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userData.nome;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const data = await fazerRequisicao('/login', 'POST', { email, senha });
            if (data.success) {
                redirecionarParaHome(data.userType);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao fazer login.');
        }
    });
}

// Cadastro
const cadastroForm = document.getElementById('cadastroForm');
if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const tipo = document.getElementById('tipo').value;

        try {
            const data = await fazerRequisicao('/cadastro', 'POST', { nome, email, senha, tipo });
            if (data.success) {
                alert('Cadastro realizado com sucesso!');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao cadastrar.');
        }
    });
}

// Carregar serviços
async function carregarServicos() {
    try {
        const servicos = await fazerRequisicao('/api/servicos');
        const listaServicos = document.getElementById('listaServicos');
        if (!listaServicos) {
            console.error('Elemento listaServicos não encontrado');
            return;
        }
        listaServicos.innerHTML = '';
        servicos.forEach(servico => {
            const servicoElement = document.createElement('div');
            servicoElement.className = 'servico-item';
            const preco = typeof servico.preco === 'number' ? servico.preco.toFixed(2) : 'Preço indisponível';
            servicoElement.innerHTML = `
                <h3>${servico.nome}</h3>
                <p>${servico.descricao}</p>
                <p><strong>Preço:</strong> R$ ${preco}</p>
                <button onclick="location.href='servico.html?id=${servico.id}'">Agendar</button>
            `;
            listaServicos.appendChild(servicoElement);
        });
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

// Carregar detalhes do serviço e agendamento
async function carregarDetalhesServico() {
    const urlParams = new URLSearchParams(window.location.search);
    const servicoId = urlParams.get('id');

    if (!servicoId) {
        console.error('ID do serviço não fornecido');
        return;
    }

    try {
        const servico = await fazerRequisicao(`/api/servicos/${servicoId}`);
        document.getElementById('nomeServico').textContent = servico.nome;
        document.getElementById('descricaoServico').textContent = servico.descricao;
        document.getElementById('precoServico').textContent = `Preço: R$ ${servico.preco.toFixed(2)}`;

        const dataAgendamento = document.getElementById('dataAgendamento');
        dataAgendamento.min = new Date().toISOString().split('T')[0];
        dataAgendamento.addEventListener('change', () => atualizarHorariosDisponiveis(servicoId));

        const formAgendamento = document.getElementById('formAgendamento');
        formAgendamento.onsubmit = (e) => agendarServico(e, servicoId);
    } catch (error) {
        console.error('Erro ao carregar detalhes do serviço:', error);
        alert('Ocorreu um erro ao carregar os detalhes do serviço.');
    }
}

// Função para atualizar horários disponíveis
async function atualizarHorariosDisponiveis(servicoId) {
    const data = document.getElementById('dataAgendamento').value;
    const horarioSelect = document.getElementById('horarioAgendamento');

    if (!data) {
        console.error('Data não selecionada');
        return;
    }

    try {
        const horariosDisponiveis = await fazerRequisicao(`/api/horarios-disponiveis?servicoId=${servicoId}&data=${data}`);
        console.log('Horários disponíveis:', horariosDisponiveis);

        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horariosDisponiveis.forEach(horario => {
            const option = document.createElement('option');
            option.value = horario;
            option.textContent = horario;
            horarioSelect.appendChild(option);
        });

        if (horariosDisponiveis.length === 0) {
            horarioSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
        }

        horarioSelect.style.display = 'block';
    } catch (error) {
        console.error('Erro ao obter horários disponíveis:', error);
        alert('Ocorreu um erro ao carregar os horários disponíveis.');
    }
}

// Função para mostrar o popup de agendamento
function mostrarPopupAgendamento() {
    const popup = document.getElementById('popupAgendamento');
    popup.style.display = 'flex';
}

// Função para agendar serviço
async function agendarServico(e, servicoId) {
    e.preventDefault();
    const data = document.getElementById('dataAgendamento').value;
    const horario = document.getElementById('horarioAgendamento').value;

    if (!data || !horario) {
        alert('Por favor, selecione uma data e um horário.');
        return;
    }

    try {
        const response = await fazerRequisicao('/api/agendar', 'POST', { servicoId, data, horario });
        if (response.success) {
            mostrarPopupAgendamento();
        } else {
            alert('Não foi possível agendar o serviço. O horário pode já estar ocupado.');
            atualizarHorariosDisponiveis(servicoId);
        }
    } catch (error) {
        console.error('Erro ao agendar serviço:', error);
        alert('Ocorreu um erro ao agendar o serviço.');
    }
}

// Carregar portfólio
async function carregarPortfolio() {
    try {
        const portfolioItems = await fazerRequisicao('/portfolio');
        const listaPortfolio = document.getElementById('listaPortfolio');
        listaPortfolio.innerHTML = '';
        portfolioItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'portfolio-item';
            itemElement.innerHTML = `
                <h3>${item.titulo}</h3>
                <img src="${item.imagem}" alt="${item.titulo}" style="max-width: 200px;">
                <p>${item.descricao}</p>
            `;
            listaPortfolio.appendChild(itemElement);
        });

        // Mostrar formulário de adição apenas para proprietária
        const userData = await fazerRequisicao('/user-data');
        if (userData.tipo === 'proprietaria') {
            document.getElementById('adicionarPortfolio').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao carregar portfólio:', error);
    }
}

// Adicionar item ao portfólio
const portfolioForm = document.getElementById('portfolioForm');
if (portfolioForm) {
    portfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const imagem = document.getElementById('imagem').value;

        try {
            const userData = await fazerRequisicao('/user-data');
            if (userData.tipo !== 'proprietaria') {
                throw new Error('Acesso negado. Apenas a proprietária pode adicionar itens ao portfólio.');
            }
            
            await fazerRequisicao('/adicionar-portfolio', 'POST', { titulo, descricao, imagem });
            alert('Item adicionado ao portfólio com sucesso!');
            carregarPortfolio();
        } catch (error) {
            console.error('Erro ao adicionar item ao portfólio:', error);
            alert(error.message || 'Ocorreu um erro ao adicionar o item ao portfólio.');
        }
    });
}

// Carregar dados da conta do usuário
async function carregarDadosConta() {
    try {
        const userData = await fazerRequisicao('/user-data');
        const dadosUsuario = document.getElementById('dadosUsuario');
        if (dadosUsuario) {
            dadosUsuario.innerHTML = `
                <h2>Dados Pessoais</h2>
                <div class="info-item"><span class="info-label">Nome:</span> ${userData.nome}</div>
                <div class="info-item"><span class="info-label">E-mail:</span> ${userData.email}</div>
            `;
        } else {
            console.error('Elemento dadosUsuario não encontrado');
        }

        const consultas = await fazerRequisicao('/api/minhas-consultas');
        const minhasConsultas = document.getElementById('minhasConsultas');
        if (minhasConsultas) {
            if (consultas.length === 0) {
                minhasConsultas.innerHTML = '<p>Você não tem consultas agendadas.</p>';
            } else {
                const tabelaConsultas = document.createElement('table');
                tabelaConsultas.innerHTML = `
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>Serviço</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaConsultas"></tbody>
                `;
                minhasConsultas.appendChild(tabelaConsultas);

                const tabelaConsultasBody = document.getElementById('tabelaConsultas');
                consultas.forEach(consulta => {
                    const row = tabelaConsultasBody.insertRow();
                    row.setAttribute('data-consulta-id', consulta.id);
                    row.innerHTML = `
                        <td>${new Date(consulta.data).toLocaleDateString()}</td>
                        <td>${consulta.horario}</td>
                        <td>${consulta.servico}</td>
                        <td>
                            <a href="servicos.html" class="btn">Remarcar</a>
                            <button onclick="cancelarConsulta(${consulta.id})" class="btn">Cancelar</button>
                        </td>
                    `;
                });
            }
        } else {
            console.error('Elemento minhasConsultas não encontrado');
        }

        // Adicionar botão para agendar nova consulta
        const agendarNovaConsulta = document.createElement('a');
        agendarNovaConsulta.href = 'servicos.html';
        agendarNovaConsulta.className = 'btn';
        agendarNovaConsulta.id = 'agendarConsulta';
        agendarNovaConsulta.textContent = 'Agendar Nova Consulta';
        document.querySelector('.container').appendChild(agendarNovaConsulta);

    } catch (error) {
        console.error('Erro ao carregar dados da conta:', error);
    }
}

// Carregar dados da proprietária
async function carregarDadosProprietaria() {
    try {
        const dadosFinanceiros = await fazerRequisicao('/dados-financeiros');
        const todasConsultas = await fazerRequisicao('/todas-consultas');

        // Gráfico financeiro
        const ctxFinanceiro = document.getElementById('graficoFinanceiro').getContext('2d');
        const graficoFinanceiro = new Chart(ctxFinanceiro, {
            type: 'bar',
            data: {
                labels: dadosFinanceiros.map(d => {
                    const date = new Date(d.mes);
                    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'Lucro',
                        data: dadosFinanceiros.map(d => d.lucro),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    },
                    {
                        label: 'Gastos',
                        data: dadosFinanceiros.map(d => d.gastos),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    }
                ]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Dados Financeiros'
                }
            }
        });

        // Gráfico de consultas
        const consultasPorMes = todasConsultas.reduce((acc, consulta) => {
            const mes = new Date(consulta.data).toLocaleString('default', { month: 'long' });
            acc[mes] = (acc[mes] || 0) + 1;
            return acc;
        }, {});

        const ctxConsultas = document.getElementById('graficoConsultas').getContext('2d');
        new Chart(ctxConsultas, {
            type: 'line',
            data: {
                labels: Object.keys(consultasPorMes),
                datasets: [{
                    label: 'Número de Consultas',
                    data: Object.values(consultasPorMes),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Consultas por Mês'
                }
            }
        });

        // Separar consultas agendadas e concluídas
        consultasAgendadasCompletas = todasConsultas.filter(c => !c.concluida);
        consultasConcluidasCompletas = todasConsultas.filter(c => c.concluida);

        // Exibir consultas iniciais
        exibirConsultas(consultasAgendadasCompletas, 'consultasAgendadas', 'mostrarMaisAgendadas');
        exibirConsultas(consultasConcluidasCompletas, 'consultasConcluidas', 'mostrarMaisConcluidas');

    } catch (error) {
        console.error('Erro ao carregar dados da proprietária:', error);
    }
}

// Função para exibir consultas
function exibirConsultas(consultas, elementId, botaoId, inicio = 0) {
    const elemento = document.getElementById(elementId);
    const consultasExibidas = consultas.slice(inicio, inicio + consultasPorPagina);
    
    if (inicio === 0) {
        elemento.innerHTML = ''; // Limpa o conteúdo anterior apenas na primeira exibição
    }

    consultasExibidas.forEach(consulta => {
        const consultaElement = document.createElement('div');
        consultaElement.className = 'consulta-item';
        consultaElement.innerHTML = `
            <p><strong>Cliente:</strong> ${consulta.cliente}</p>
            <p><strong>Serviço:</strong> ${consulta.servico}</p>
            <p><strong>Preço:</strong> R$ ${parseFloat(consulta.preco).toFixed(2)}</p>
            <p><strong>Data:</strong> ${new Date(consulta.data).toLocaleDateString()}</p>
            <p><strong>Horário:</strong> ${consulta.horario}</p>
            ${!consulta.concluida ? `
                <button onclick="concluirConsulta(${consulta.id})">Concluir</button>
                <button onclick="cancelarConsulta(${consulta.id})" class="cancelar">Cancelar</button>
            ` : ''}
        `;
        elemento.appendChild(consultaElement);
    });

    const botaoMostrarMais = document.getElementById(botaoId);
    if (inicio + consultasPorPagina < consultas.length) {
        botaoMostrarMais.style.display = 'block';
        botaoMostrarMais.onclick = () => exibirConsultas(consultas, elementId, botaoId, inicio + consultasPorPagina);
    } else {
        botaoMostrarMais.style.display = 'none';
    }
}

// Função para concluir consulta
async function concluirConsulta(consultaId) {
    try {
        await fazerRequisicao('/concluir-consulta', 'POST', { appointmentId: consultaId });
        alert('Consulta concluída com sucesso!');
        // Atualizar as listas de consultas
        const consultaAtualizada = consultasAgendadasCompletas.find(c => c.id === consultaId);
        if (consultaAtualizada) {
            consultaAtualizada.concluida = true;
            consultasAgendadasCompletas = consultasAgendadasCompletas.filter(c => c.id !== consultaId);
            consultasConcluidasCompletas.push(consultaAtualizada);
        }
        // Reexibir as consultas atualizadas
        document.getElementById('consultasAgendadas').innerHTML = '';
        document.getElementById('consultasConcluidas').innerHTML = '';
        exibirConsultas(consultasAgendadasCompletas, 'consultasAgendadas', 'mostrarMaisAgendadas');
        exibirConsultas(consultasConcluidasCompletas, 'consultasConcluidas', 'mostrarMaisConcluidas');
    } catch (error) {
        console.error('Erro ao concluir consulta:', error);
        alert('Ocorreu um erro ao concluir a consulta.');
    }
}

// Função para cancelar consulta
async function cancelarConsulta(consultaId) {
    if (confirm('Tem certeza que deseja cancelar esta consulta?')) {
        try {
            const response = await fazerRequisicao('/cancelar-consulta', 'POST', { appointmentId: consultaId });
            if (response.success) {
                alert('Consulta cancelada com sucesso!');
                atualizarInterfaceAposCancelamento(consultaId);
            } else {
                throw new Error('Falha ao cancelar consulta');
            }
        } catch (error) {
            console.error('Erro ao cancelar consulta:', error);
            alert('Ocorreu um erro ao cancelar a consulta. Por favor, tente novamente mais tarde.');
        }
    }
}

function atualizarInterfaceAposCancelamento(consultaId) {
    // Remove a consulta da lista de consultas agendadas
    consultasAgendadasCompletas = consultasAgendadasCompletas.filter(c => c.id !== consultaId);
    
    // Reexibe as consultas atualizadas
    const consultasAgendadasElement = document.getElementById('consultasAgendadas');
    if (consultasAgendadasElement) {
        consultasAgendadasElement.innerHTML = '';
        exibirConsultas(consultasAgendadasCompletas, 'consultasAgendadas', 'mostrarMaisAgendadas');
    }

    // Se estiver na página de conta do usuário, atualiza a tabela de consultas
    const tabelaConsultas = document.getElementById('tabelaConsultas');
    if (tabelaConsultas) {
        const linhaParaRemover = tabelaConsultas.querySelector(`tr[data-consulta-id="${consultaId}"]`);
        if (linhaParaRemover) {
            linhaParaRemover.remove();
        }
    }
}

// Função para verificar notificações
async function verificarNotificacoes() {
    try {
        const notificacoes = await fazerRequisicao('/api/notificacoes');
        if (notificacoes.length > 0) {
            notificacoes.forEach(notificacao => {
                alert(`Lembrete: Você tem uma consulta de ${notificacao.servico} agendada para hoje às ${notificacao.horario}.`);
            });
        }
    } catch (error) {
        console.error('Erro ao verificar notificações:', error);
    }
}

// Função para atualizar o calendário
function atualizarCalendario() {
    const mesAno = document.getElementById('mes-ano');
    const diasContainer = document.getElementById('dias');

    mesAno.textContent = dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);

    diasContainer.innerHTML = '';

    for (let i = 0; i < primeiroDia.getDay(); i++) {
        diasContainer.appendChild(document.createElement('div'));
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const diaElement = document.createElement('div');
        diaElement.textContent = dia;
        diaElement.classList.add('dia');

        const dataAtualStr = `${dataAtual.getFullYear()}-${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

        if (consultasSelecionadas.some(consulta => consulta.data === dataAtualStr)) {
            diaElement.classList.add('tem-consulta');
        }

        if (diasIndisponiveis.includes(dataAtualStr)) {
            diaElement.classList.add('indisponivel');
        }

        diaElement.addEventListener('click', () => selecionarDia(dataAtualStr));
        diasContainer.appendChild(diaElement);
    }
}

// Função para selecionar um dia
function selecionarDia(data) {
    const consultasContainer = document.getElementById('consultas');
    consultasContainer.innerHTML = '';

    const consultasDoDia = consultasSelecionadas.filter(consulta => consulta.data === data);

    if (consultasDoDia.length > 0) {
        consultasDoDia.forEach(consulta => {
            const consultaElement = document.createElement('div');
            consultaElement.classList.add('consulta');
            consultaElement.innerHTML = `
                <h3>${consulta.servico}</h3>
                <p><strong>Cliente:</strong> ${consulta.cliente}</p>
                <p><strong>Horário:</strong> ${consulta.horario}</p>
            `;
            consultasContainer.appendChild(consultaElement);
        });
    } else {
        consultasContainer.innerHTML = '<p>Nenhuma consulta agendada para este dia.</p>';
    }
}

// Função para agendar uma consulta
async function agendarConsulta(event) {
    event.preventDefault();

    const dataConsulta = document.getElementById('dataConsulta').value;
    const nomeCliente = document.getElementById('nomeCliente').value;
    const servico = document.getElementById('servico').value;
    const horario = document.getElementById('horario').value;

    try {
        const novaConsulta = await fazerRequisicao('/agendar-consulta', 'POST', {
            data: dataConsulta,
            cliente: nomeCliente,
            servico: servico,
            horario: horario
        });

        consultasSelecionadas.push(novaConsulta);
        atualizarCalendario();
        alert('Consulta agendada com sucesso!');
        event.target.reset();
    } catch (error) {
        console.error('Erro ao agendar consulta:', error);
        alert('Ocorreu um erro ao agendar a consulta. Por favor, tente novamente.');
    }
}

// Função para definir um dia como indisponível
async function definirDiaIndisponivel(event) {
    event.preventDefault();

    const dataIndisponivel = document.getElementById('dataIndisponivel').value;

    try {
        await fazerRequisicao('/definir-dia-indisponivel', 'POST', { data: dataIndisponivel });
        diasIndisponiveis.push(dataIndisponivel);
        atualizarCalendario();
        alert('Dia definido como indisponível com sucesso!');
        event.target.reset();
    } catch (error) {
        console.error('Erro ao definir dia indisponível:', error);
        alert('Ocorreu um erro ao definir o dia como indisponível. Por favor, tente novamente.');
    }
}

// Função para carregar dados existentes
async function carregarDados() {
    try {
        const consultas = await fazerRequisicao('/consultas');
        consultasSelecionadas = consultas;

        const indisponiveis = await fazerRequisicao('/dias-indisponiveis');
        diasIndisponiveis = indisponiveis;

        atualizarCalendario();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}


// Função para carregar clientes
async function carregarClientes() {
    try {
        const clientes = await fazerRequisicao('/api/clientes');
        const selectCliente = document.getElementById('cliente');
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                selectCliente.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

// Função para carregar mensagens
async function carregarMensagens() {
    try {
        const mensagens = await fazerRequisicao('/api/mensagens');
        const listaMensagens = document.getElementById('listaMensagens');
        if (listaMensagens) {
            listaMensagens.innerHTML = '';
            mensagens.forEach(mensagem => {
                const mensagemElement = document.createElement('div');
                mensagemElement.className = 'mensagem';
                mensagemElement.innerHTML = `
                    <p><strong>De:</strong> ${mensagem.remetente}</p>
                    <p><strong>Para:</strong> ${mensagem.destinatario}</p>
                    <p><strong>Mensagem:</strong> ${mensagem.conteudo}</p>
                    <p><strong>Data:</strong> ${new Date(mensagem.data).toLocaleString()}</p>
                `;
                listaMensagens.appendChild(mensagemElement);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

// Função para enviar mensagem
async function enviarMensagem(event) {
    event.preventDefault();
    const clienteId = document.getElementById('cliente').value;
    const conteudo = document.getElementById('mensagem').value;

    try {
        await fazerRequisicao('/api/enviar-mensagem', 'POST', { clienteId, conteudo });
        alert('Mensagem enviada com sucesso!');
        document.getElementById('enviarMensagemForm').reset();
        carregarMensagens();
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente.');
    }
}


// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();
    if (window.location.pathname.includes('servicos.html')) {
        carregarServicos();
    } else if (window.location.pathname.includes('servico.html')) {
        carregarDetalhesServico();
    } else if (window.location.pathname.includes('portfolio.html')) {
        carregarPortfolio();
    } else if (window.location.pathname.includes('minha-conta.html')) {
        carregarDadosConta();
    } else if (window.location.pathname.includes('home-proprietaria.html')) {
        carregarDadosProprietaria();
    } else if (window.location.pathname.includes('agenda.html')) {
        atualizarCalendario();
        
        document.getElementById('mes-anterior').addEventListener('click', () => {
            dataAtual.setMonth(dataAtual.getMonth() - 1);
            atualizarCalendario();
        });

        document.getElementById('proximo-mes').addEventListener('click', () => {
            dataAtual.setMonth(dataAtual.getMonth() + 1);
            atualizarCalendario();
        });

        const agendarConsultaForm = document.getElementById('agendarConsultaForm');
        if (agendarConsultaForm) {
            agendarConsultaForm.addEventListener('submit', agendarConsulta);
        }

        const definirIndisponivelForm = document.getElementById('definirIndisponivelForm');
        if (definirIndisponivelForm) {
            definirIndisponivelForm.addEventListener('submit', definirDiaIndisponivel);
        }

        // Carregar consultas e dias indisponíveis existentes
        carregarDados();
    } else if (window.location.pathname.includes('mensagens.html')) {
        carregarMensagens();
        const enviarMensagemForm = document.getElementById('enviarMensagemForm');
        if (enviarMensagemForm) {
            carregarClientes();
            enviarMensagemForm.addEventListener('submit', enviarMensagem);
        }
    }

    // Verificar notificações a cada minuto
    setInterval(verificarNotificacoes, 60000);

    // Adicionar event listeners para os botões do popup
    const btnAdicionarMaisServicos = document.getElementById('adicionarMaisServicos');
    const btnConcluirAgendamento = document.getElementById('concluirAgendamento');

    if (btnAdicionarMaisServicos) {
        btnAdicionarMaisServicos.addEventListener('click', () => {
            window.location.href = 'servicos.html';
        });
    }

    if (btnConcluirAgendamento) {
        btnConcluirAgendamento.addEventListener('click', () => {
            window.location.href = 'minha-conta.html';
        });
    }
});

