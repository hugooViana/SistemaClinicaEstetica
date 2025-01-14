const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

// Configuração do banco de dados
const HOST = 'localhost';
const USER = 'root';
const PASSWORD = '1234';
const DATABASE_NAME = 'estetica_db';

const db = mysql.createConnection({
  host: HOST,
  user: USER,
  password: PASSWORD,
  database: DATABASE_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'segredo',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mude para true se estiver usando HTTPS
}));

// Middleware para verificar autenticação
const verificarAutenticacao = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado' });
  }
};

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "nels.gleason35@ethereal.email",
    pass: "SvfvHyPVbXneFQQ6gJ",
  },
});

// Rota para login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [users] = await db.promise().query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const user = users[0];
    const senhaCorreta = await bcrypt.compare(senha, user.senha);
    if (senhaCorreta) {
      req.session.userId = user.id;
      req.session.userType = user.tipo;
      console.log('Login bem-sucedido. ID do usuário:', user.id);
      res.json({ success: true, userType: user.tipo });
    } else {
      res.status(401).json({ error: 'Senha incorreta' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Rota para cadastro
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha, tipo } = req.body;
  
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    const query = 'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)';
    
    db.query(query, [nome, email, hashedSenha, tipo], (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
        return;
      }
      res.status(201).json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Rota para obter dados do usuário
app.get('/user-data', verificarAutenticacao, (req, res) => {
  const query = 'SELECT nome, email, tipo FROM usuarios WHERE id = ?';
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter dados do usuário' });
      return;
    }
    res.json(results[0]);
  });
});

// Rota para obter serviços
app.get('/api/servicos', (req, res) => {
  const query = 'SELECT * FROM servicos';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter serviços' });
      return;
    }
    const servicos = results.map(servico => ({
      ...servico,
      preco: parseFloat(servico.preco)
    }));
    res.json(servicos);
  });
});

// Rota para agendar serviço
app.post('/api/agendar', verificarAutenticacao, async (req, res) => {
  console.log('Requisição de agendamento recebida:', req.body);
  const { servicoId, data, horario } = req.body;
  
  try {
    // Verificar se o serviço existe
    const [servicos] = await db.promise().query('SELECT nome FROM servicos WHERE id = ?', [servicoId]);
    
    if (servicos.length === 0) {
      console.log('Serviço não encontrado');
      return res.status(400).json({ error: 'Serviço não encontrado' });
    }

    const servico = servicos[0];

    // Inserir o agendamento
    const [resultado] = await db.promise().query(
      'INSERT INTO agendamentos (usuario_id, servico_id, data, horario) VALUES (?, ?, ?, ?)',
      [req.session.userId, servicoId, data, horario]
    );

    console.log('Agendamento inserido:', resultado);

    // Criar mensagem de confirmação
    const mensagem = `Sua consulta de ${servico.nome} foi agendada para ${data} às ${horario}.`;
    await criarMensagem(req.session.userId, 'confirmacao', mensagem);

    console.log('Mensagem de confirmação criada para o usuário:', req.session.userId);

    res.status(201).json({ success: true, message: 'Consulta agendada com sucesso' });
  } catch (error) {
    console.error('Erro ao agendar serviço:', error);
    res.status(500).json({ error: 'Erro ao agendar serviço' });
  }
});

// Rota para obter horários disponíveis
app.get('/api/horarios-disponiveis', (req, res) => {
  const { servicoId, data } = req.query;
  const query = 'SELECT horario FROM agendamentos WHERE servico_id = ? AND data = ?';
  
  db.query(query, [servicoId, data], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter horários disponíveis' });
      return;
    }
    const horariosOcupados = results.map(row => row.horario);
    const todosHorarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const horariosDisponiveis = todosHorarios.filter(horario => !horariosOcupados.includes(horario));
    res.json(horariosDisponiveis);
  });
});

// Rota para obter itens do portfólio
app.get('/portfolio', (req, res) => {
  const query = 'SELECT * FROM portfolio';
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter itens do portfólio' });
      return;
    }
    res.json(results);
  });
});

// Rota para adicionar item ao portfólio (apenas para proprietária)
app.post('/adicionar-portfolio', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { titulo, descricao, imagem } = req.body;
  const query = 'INSERT INTO portfolio (titulo, descricao, imagem) VALUES (?, ?, ?)';
  
  db.query(query, [titulo, descricao, imagem], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao adicionar item ao portfólio' });
      return;
    }
    res.status(201).json({ success: true });
  });
});

// Rota para obter consultas do usuário
app.get('/api/minhas-consultas', verificarAutenticacao, (req, res) => {
  const query = `
    SELECT a.id, s.nome as servico, s.preco, a.data, a.horario, a.concluida
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.usuario_id = ?
    ORDER BY a.data, a.horario
  `;
  
  db.query(query, [req.session.userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter consultas' });
      return;
    }
    res.json(results);
  });
});

// Rota para obter dados financeiros (apenas para proprietária)
app.get('/dados-financeiros', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const query = `
    SELECT 
      DATE_FORMAT(a.data, '%Y-%m-01') as mes,
      SUM(CASE WHEN a.concluida = 1 THEN s.preco ELSE 0 END) as lucro,
      0 as gastos
    FROM 
      agendamentos a
    JOIN 
      servicos s ON a.servico_id = s.id
    GROUP BY 
      DATE_FORMAT(a.data, '%Y-%m-01')
    ORDER BY 
      mes
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter dados financeiros' });
      return;
    }
    res.json(results);
  });
});

// Rota para obter todas as consultas (apenas para proprietária)
app.get('/todas-consultas', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const query = `
    SELECT a.id, u.nome as cliente, s.nome as servico, s.preco, a.data, a.horario, a.concluida
    FROM agendamentos a
    JOIN usuarios u ON a.usuario_id = u.id
    JOIN servicos s ON a.servico_id = s.id
    ORDER BY a.data, a.horario
  `;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter consultas' });
      return;
    }
    res.json(results);
  });
});

// Rota para concluir consulta
app.post('/concluir-consulta', verificarAutenticacao, (req, res) => {
  if (req.session.userType !== 'proprietaria') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { appointmentId } = req.body;
  const query = 'UPDATE agendamentos SET concluida = 1 WHERE id = ?';
  
  db.query(query, [appointmentId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao concluir consulta' });
      return;
    }
    res.json({ success: true });
  });
});

// Rota para cancelar consulta
app.post('/cancelar-consulta', verificarAutenticacao, async (req, res) => {
  const { appointmentId } = req.body;
  
  try {
    // Verificar se o usuário é a proprietária
    if (req.session.userType !== 'proprietaria') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Obter detalhes da consulta
    const [consultas] = await db.promise().query(
      'SELECT a.id, a.usuario_id, s.nome as servico, a.data, a.horario FROM agendamentos a JOIN servicos s ON a.servico_id = s.id WHERE a.id = ?',
      [appointmentId]
    );

    if (consultas.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada' });
    }

    const consulta = consultas[0];

    // Cancelar a consulta
    await db.promise().query('DELETE FROM agendamentos WHERE id = ?', [appointmentId]);

    // Criar mensagem de cancelamento
    const mensagem = `Sua consulta de ${consulta.servico} agendada para ${consulta.data} às ${consulta.horario} foi cancelada pela proprietária.`;
    await criarMensagem(consulta.usuario_id, 'cancelamento', mensagem);

    console.log('Mensagem de cancelamento criada para o usuário:', consulta.usuario_id);

    res.json({ success: true, message: 'Consulta cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar consulta:', error);
    res.status(500).json({ error: 'Erro ao cancelar consulta' });
  }
});

// Rota para obter detalhes de um serviço específico
app.get('/api/servicos/:id', (req, res) => {
  const query = 'SELECT * FROM servicos WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Erro ao obter detalhes do serviço:', err);
      res.status(500).json({ error: 'Erro ao obter detalhes do serviço' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Serviço não encontrado' });
      return;
    }
    
    const servico = results[0];
    servico.preco = parseFloat(servico.preco);
    
    res.json(servico);
  });
});

// Nova rota para verificar notificações
app.get('/api/notificacoes', verificarAutenticacao, (req, res) => {
  const agora = new Date();
  const em15Minutos = new Date(agora.getTime() + 15 * 60000);
  
  const query = `
    SELECT a.id, s.nome as servico, a.data, a.horario
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.usuario_id = ? AND a.concluida = 0
    AND CONCAT(a.data, ' ', a.horario) BETWEEN ? AND ?
  `;
  
  db.query(query, [req.session.userId, agora.toISOString().slice(0, 19).replace('T', ' '), em15Minutos.toISOString().slice(0, 19).replace('T', ' ')], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao verificar notificações' });
      return;
    }
    res.json(results);
  });
});

// Função para enviar e-mail de notificação
async function enviarEmailNotificacao(email, nome, servico, data, horario) {
  const mensagem = await obterMensagemPredefinida('Lembrete detalhado');
  const conteudoPersonalizado = mensagem.conteudo
    .replace('{servico}', servico)
    .replace('{horario}', horario);

  const mailOptions = {
    from: 'seu_email@exemplo.com',
    to: email,
    subject: 'Lembrete de Consulta',
    text: `Olá ${nome},\n\n${conteudoPersonalizado}\n\nData: ${data}\nHorário: ${horario}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail de notificação enviado para ${email}`);
  } catch (error) {
    console.error('Erro ao enviar e-mail de notificação:', error);
  }
}

// Função para obter mensagem predefinida
function obterMensagemPredefinida(titulo) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM mensagens_predefinidas WHERE titulo = ?';
    db.query(query, [titulo], (err, results) => {
      if (err) {
        reject(err);
      } else if (results.length === 0) {
        reject(new Error('Mensagem predefinida não encontrada'));
      } else {
        resolve(results[0]);
      }
    });
  });
}

// Função para verificar e enviar notificações
function verificarEEnviarNotificacoes() {
  const agora = new Date();
  const em15Minutos = new Date(agora.getTime() + 15 * 60000);
  
  const query = `
    SELECT a.id, u.email, u.nome, s.nome as servico, a.data, a.horario
    FROM agendamentos a
    JOIN usuarios u ON a.usuario_id = u.id
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.concluida = 0
    AND CONCAT(a.data, ' ', a.horario) BETWEEN ? AND ?
  `;
  
  db.query(query, [agora.toISOString().slice(0, 19).replace('T', ' '), em15Minutos.toISOString().slice(0, 19).replace('T', ' ')], (err, results) => {
    if (err) {
      console.error('Erro ao verificar notificações:', err);
      return;
    }
    results.forEach(consulta => {
      enviarEmailNotificacao(consulta.email, consulta.nome, consulta.servico, consulta.data, consulta.horario);
    });
  });
}

// Rota para obter avaliações
app.get('/api/avaliacoes', (req, res) => {
  const query = `
    SELECT a.id, s.nome as servico, a.estrelas, a.comentario, u.nome as usuario
    FROM avaliacoes a
    JOIN servicos s ON a.servico_id = s.id
    JOIN usuarios u ON a.usuario_id = u.id
    ORDER BY a.data_criacao DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter avaliações' });
      return;
    }
    res.json(results);
  });
});

// Rota para enviar avaliação
app.post('/api/avaliar', verificarAutenticacao, (req, res) => {
  const { servicoId, estrelas, comentario } = req.body;
  const userId = req.session.userId;

  // Verificar se o usuário já realizou o serviço
  const checkQuery = `
    SELECT id FROM agendamentos 
    WHERE usuario_id = ? AND servico_id = ? AND concluida = 1
  `;
  
  db.query(checkQuery, [userId, servicoId], (checkErr, checkResults) => {
    if (checkErr) {
      res.status(500).json({ error: 'Erro ao verificar elegibilidade para avaliação' });
      return;
    }
    
    if (checkResults.length === 0) {
      res.status(403).json({ error: 'Você não pode avaliar um serviço que não realizou' });
      return;
    }
    
    // Inserir a avaliação
    const insertQuery = `
      INSERT INTO avaliacoes (usuario_id, servico_id, estrelas, comentario)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(insertQuery, [userId, servicoId, estrelas, comentario], (insertErr, insertResult) => {
      if (insertErr) {
        res.status(500).json({ error: 'Erro ao salvar avaliação' });
        return;
      }
      res.json({ success: true });
    });
  });
});

// Rota para obter consultas do mês
app.get('/api/consultas-do-mes', verificarAutenticacao, (req, res) => {
  const { ano, mes } = req.query;
  const query = `
    SELECT a.id, a.data, a.horario, u.nome as cliente, s.nome as servico
    FROM agendamentos a
    JOIN usuarios u ON a.usuario_id = u.id
    JOIN servicos s ON a.servico_id = s.id
    WHERE YEAR(a.data) = ? AND MONTH(a.data) = ?
    ORDER BY a.data, a.horario
  `;
  
  db.query(query, [ano, mes], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Erro ao obter consultas do mês' });
      return;
    }
    res.json(results);
  });
});

// Rota para obter todas as consultas
app.get('/consultas', verificarAutenticacao, (req, res) => {
  const query = 'SELECT * FROM agendamentos';
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      res.status(500).json({ error: 'Error fetching appointments' });
      return;
    }
    res.json(result);
  });
});

// Rota para obter dias indisponíveis
app.get('/dias-indisponiveis', verificarAutenticacao, (req, res) => {
  const query = 'SELECT * FROM dias_indisponiveis';
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching unavailable days:', err);
      res.status(500).json({ error: 'Error fetching unavailable days' });
      return;
    }
    res.json(result.map(row => row.data));
  });
});

// Rota para definir um dia como indisponível
app.post('/definir-dia-indisponivel', verificarAutenticacao, (req, res) => {
  const { data } = req.body;
  const query = 'INSERT INTO dias_indisponiveis (data) VALUES (?)';
  db.query(query, [data], (err, result) => {
    if (err) {
      console.error('Error setting day as unavailable:', err);
      res.status(500).json({ error: 'Error setting day as unavailable' });
      return;
    }
    res.json({ success: true });
  });
});

// Rota para obter mensagens do usuário
app.get('/api/mensagens', verificarAutenticacao, (req, res) => {
  console.log('Requisição de mensagens recebida para usuário:', req.session.userId);
  
  const query = `
      SELECT id, tipo, conteudo, data_criacao
      FROM mensagens
      WHERE usuario_id = ?
      ORDER BY data_criacao DESC
  `;
  
  db.query(query, [req.session.userId], (err, results) => {
      if (err) {
          console.error('Erro ao buscar mensagens:', err);
          res.status(500).json({ error: 'Erro ao buscar mensagens' });
          return;
      }
      
      console.log('Mensagens encontradas:', results);
      res.json(results);
  });
});
// Rota para agendar uma consulta (modificada)
app.post('/api/agendar-consulta', async (req, res) => {
  const { data, nome, servico, horario } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO consultas (data, nome, servico, horario) VALUES (?, ?, ?, ?)',
      [data, nome, servico, horario]
    );
    if (result.affectedRows === 1) {
      res.status(201).json({ message: 'Consulta agendada com sucesso', id: result.insertId });
    } else {
      throw new Error('Falha ao inserir consulta no banco de dados');
    }
  } catch (error) {
    console.error('Erro ao agendar consulta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
// Função para criar uma mensagem no sistema
async function criarMensagem(usuarioId, tipo, conteudo) {
  console.log('Tentando criar mensagem:', { usuarioId, tipo, conteudo });
  
  return new Promise((resolve, reject) => {
      const query = 'INSERT INTO mensagens (usuario_id, tipo, conteudo) VALUES (?, ?, ?)';
      db.query(query, [usuarioId, tipo, conteudo], (err, result) => {
          if (err) {
              console.error('Erro ao criar mensagem:', err);
              reject(err);
          } else {
              console.log('Mensagem criada com sucesso:', result);
              resolve(result);
          }
      });
  });
}

// Rota de teste para criar uma mensagem
app.post('/api/teste-criar-mensagem', verificarAutenticacao, async (req, res) => {
  try {
      const mensagem = await criarMensagem(req.session.userId, 'confirmacao', 'Esta é uma mensagem de teste.');
      res.json({ success: true, message: 'Mensagem de teste criada com sucesso', mensagem });
  } catch (error) {
      console.error('Erro ao criar mensagem de teste:', error);
      res.status(500).json({ error: 'Erro ao criar mensagem de teste' });
  }
});

// Executar a verificação de notificações a cada minuto
setInterval(verificarEEnviarNotificacoes, 60000);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Acesse o sistema através do link: http://localhost:${port}`);
});

