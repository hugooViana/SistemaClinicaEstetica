# Sistema Clinica Estetica
O principal objetivo deste projeto é desenvolver uma solução de software integrada que simplifique a gestão operacional da clínica de estética especializada. Atualmente, a clínica enfrenta dificuldades no gerenciamento eficaz das finanças, estoque e acompanhamento dos pacientes devido à falta de um sistema unificado. Com uma vasta gama de serviços como botox, tratamentos de pele e bioestimuladores, a falta de organização tem impactado negativamente a tomada de decisões e o crescimento da clínica.

A proposta visa criar uma plataforma intuitiva que centralize o controle de despesas, fluxo de caixa, estoque de produtos e agendamentos de pacientes. Ao automatizar processos e melhorar o gerenciamento das operações, o software proporcionará à proprietária uma visão clara e estratégica do negócio, facilitando a administração e promovendo o desenvolvimento sustentável da clínica.
## Descrição Geral do Projeto

O projeto visa o desenvolvimento de uma plataforma digital para a Clínica Estética Juliana Pretti, localizada em Belo Horizonte, com o objetivo de otimizar o processo de agendamento, gestão de serviços e comunicação com os clientes. A clínica enfrenta dificuldades com agendamentos manuais, falta de centralização de informações e ausência de visibilidade online de seus serviços, o que impacta a experiência do cliente e limita seu crescimento. A plataforma proporcionará um atendimento mais organizado, ágil e personalizado, além de ampliar a presença digital da clínica, ajudando a atrair novos clientes e a melhorar a fidelização dos atuais. O projeto, ao automatizar e otimizar processos, tem como objetivo fortalecer o crescimento e a sustentabilidade do negócio.

## Instruções de utilização

Requisitos
Node.js (versão 14 ou superior)
MySQL (para o banco de dados)
Git (para clonagem do repositório)
Editor de código (como Visual Studio Code, IntelliJ, etc.)

Configuração do Projeto

1. Clonar o Repositório
Clone o repositório do projeto para sua máquina local utilizando o comando Git:

Copiar código
git clone https://github.com/ICEI-PUC-Minas-PPLES-TI/plf-es-2024-2-ti3-8981100-grupo-7-Estetica.git

2. Configuração do Banco de Dados
Crie um banco de dados no MySQL com o nome estetica_juliana_pretti (ou outro nome de sua escolha).
Abra o arquivo de configurações do banco de dados e insira as credenciais do seu MySQL:

No arquivo, modifique as variáveis de configuração com as informações do seu banco:

javascript
Copiar código
module.exports = {
  host: "localhost",
  user: "seu_usuario",
  password: "sua_senha",
  database: "estetica_juliana_pretti"
};

3. Instalar Dependências 
Navegue até as pastas do projeto:

cd plf-es-2024-2-ti3-8981100-grupo-7-Estetica
Instale as dependências necessárias com o npm:

npm install

4. Rodar o Frontend
Após instalar as dependências, execute o servidor do frontend com o seguinte comando:

npm run dev
O frontend será iniciado e estará disponível em http://localhost:8080.

Acessando o Sistema Localmente
Após rodar o backend e o frontend, abra o navegador e acesse o endereço do frontend:

http://localhost:8080
Você deverá ver a interface da plataforma da Clínica Estética Juliana Pretti, onde poderá interagir com as funcionalidades de agendamento, visualização de serviços e histórico de tratamentos.

Observações Finais
Banco de Dados: Certifique-se de que o MySQL esteja rodando e acessível antes de iniciar.
Erros Comuns: Caso ocorram problemas com a execução, verifique se as dependências foram corretamente instaladas e se as credenciais do banco de dados estão corretas.
