const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();
    carregarConsultas();
    inicializarTabs();
});

async function fazerRequisicao(url, metodo = 'GET', dados = null) {
    console.log(`Iniciando requisição para: ${url}`, { metodo, dados });
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
        const fullUrl = `${API_BASE_URL}${url}`;
        console.log(`Enviando requisição para: ${fullUrl}`);
        const response = await fetch(fullUrl, options);
        
        if (!response.ok) {
            console.error(`Erro na resposta: Status ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erro na requisição: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(`Resposta recebida de ${url}:`, responseData);
        return responseData;
    } catch (error) {
        console.error('Erro detalhado na requisição:', error);
        throw error;
    }
}

function inicializarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => content.classList.remove('active'));
            
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });
}

async function carregarDadosUsuario() {
    try {
        const dados = await fazerRequisicao('/user-data');
        document.getElementById('nomeUsuario').textContent = dados.nome;
        document.getElementById('emailUsuario').textContent = dados.email;
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert('Erro ao carregar dados do usuário. Por favor, tente novamente mais tarde.');
    }
}

async function carregarConsultas() {
    try {
        const consultas = await fazerRequisicao('/api/minhas-consultas');
        const consultasAgendadas = consultas.filter(consulta => !consulta.concluida);
        const consultasConcluidas = consultas.filter(consulta => consulta.concluida);
        
        exibirConsultasAgendadas(consultasAgendadas);
        exibirConsultasConcluidas(consultasConcluidas);
    } catch (error) {
        console.error('Erro ao carregar consultas:', error);
        alert('Erro ao carregar consultas. Por favor, tente novamente mais tarde.');
    }
}

function exibirConsultasAgendadas(consultas) {
    const tbody = document.getElementById('tabelaConsultasAgendadas');
    if (!tbody) {
        console.error('Elemento tabelaConsultasAgendadas não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (consultas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">Nenhuma consulta agendada</td>
            </tr>
        `;
        return;
    }

    consultas.forEach(consulta => {
        const tr = document.createElement('tr');
        tr.dataset.id = consulta.id;
        const data = new Date(consulta.data).toLocaleDateString('pt-BR');
        
        tr.innerHTML = `
            <td>${data}</td>
            <td>${consulta.horario}</td>
            <td>${consulta.servico}</td>
            <td>
                <button onclick="cancelarConsulta(${consulta.id})" class="btn primary">Cancelar</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function exibirConsultasConcluidas(consultas) {
    const tbody = document.getElementById('tabelaConsultasConcluidas');
    if (!tbody) {
        console.error('Elemento tabelaConsultasConcluidas não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (consultas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">Nenhuma consulta concluída</td>
            </tr>
        `;
        return;
    }

    consultas.forEach(consulta => {
        const tr = document.createElement('tr');
        const data = new Date(consulta.data).toLocaleDateString('pt-BR');
        
        tr.innerHTML = `
            <td>${data}</td>
            <td>${consulta.horario}</td>
            <td>${consulta.servico}</td>
            <td><span class="status-badge status-concluida">Concluída</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

async function cancelarConsulta(consultaId) {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) {
        return;
    }

    try {
        console.log(`Tentando cancelar consulta com ID: ${consultaId}`);
        const response = await fazerRequisicao('/api/cancelar-consulta', 'POST', { 
            appointmentId: consultaId 
        });

        if (response.success) {
            console.log(`Consulta ${consultaId} cancelada com sucesso`);
            const linha = document.querySelector(`#tabelaConsultasAgendadas tr[data-id="${consultaId}"]`);
            if (linha) {
                linha.remove();
                
                const tbody = document.getElementById('tabelaConsultasAgendadas');
                if (tbody && tbody.children.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align: center;">Nenhuma consulta agendada</td>
                        </tr>
                    `;
                }
            }
            
            alert('Consulta cancelada com sucesso!');
        } else {
            throw new Error('Falha ao cancelar consulta: resposta do servidor indica falha');
        }
    } catch (error) {
        console.error('Erro detalhado ao cancelar consulta:', error);
        alert(`Ocorreu um erro ao cancelar a consulta: ${error.message}`);
    }
}