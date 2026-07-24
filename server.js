const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const pastaData = path.join(__dirname, "data");
const caminhoUsuarios = path.join(pastaData, "usuarios.json");
const caminhoPedidos = path.join(pastaData, "pedidos.json");
const caminhoCardapio = path.join(pastaData, "cardapio.json");
const caminhoMesas = path.join(pastaData, "mesas.json");

function garantirArquivos() {
  if (!fs.existsSync(pastaData)) fs.mkdirSync(pastaData, { recursive: true });

  if (!fs.existsSync(caminhoUsuarios)) {
    fs.writeFileSync(
      caminhoUsuarios,
      JSON.stringify(
        [
          { usuario: "admin", senha: "123", tipo: "painel" },
          { usuario: "garcom", senha: "123", tipo: "garcom" },
          { usuario: "producao", senha: "123", tipo: "producao" }
        ],
        null,
        2
      ),
      "utf8"
    );
  }

  if (!fs.existsSync(caminhoPedidos)) {
    fs.writeFileSync(caminhoPedidos, "[]", "utf8");
  }

  if (!fs.existsSync(caminhoCardapio)) {
    fs.writeFileSync(
      caminhoCardapio,
      JSON.stringify(
        [
          {
            nome: "Hambúrgueres",
            coluna: "esquerda",
            itens: [
              {
                id: 1,
                nome: "BURG. ESPECIAL",
                descricao: "Pão, hambúrguer, ovo, presunto, queijo, salada, milho e batata.",
                preco: 14,
                esgotado: false,
                controlarEstoque: false,
                estoque: 0
              },
              {
                id: 2,
                nome: "BURG. BACON",
                descricao: "Pão, hambúrguer, bacon, ovo, presunto, queijo, salada, milho e batata.",
                preco: 16,
                esgotado: false,
                controlarEstoque: false,
                estoque: 0
              }
            ]
          },
          {
            nome: "Batatas Fritas",
            coluna: "direita",
            itens: [
              {
                id: 3,
                nome: "BATATA GRANDE",
                descricao: "300g",
                preco: 25,
                esgotado: false,
                controlarEstoque: false,
                estoque: 0
              },
              {
                id: 4,
                nome: "BATATA MÉDIA",
                descricao: "150g",
                preco: 15,
                esgotado: false,
                controlarEstoque: false,
                estoque: 0
              }
            ]
          }
        ],
        null,
        2
      ),
      "utf8"
    );
  }

  if (!fs.existsSync(caminhoMesas)) {
    fs.writeFileSync(caminhoMesas, "[]", "utf8");
  }
}

function lerJson(caminho) {
  garantirArquivos();
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch {
    return [];
  }
}

function salvarJson(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), "utf8");
}

function numeroSeguro(valor) {
  return Number(String(valor || 0).replace(",", ".")) || 0;
}

function formatarDataHoraBR(data = new Date()) {
  return new Date(data).toLocaleString("pt-BR");
}

function formatarDataBR(data = new Date()) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function gerarNumeroPedido() {
  return String(Date.now()).slice(-6);
}

function paraDataComparavelBR(texto) {
  if (!texto || typeof texto !== "string") return null;
  const p = texto.split("/");
  if (p.length !== 3) return null;
  return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
}

function dataDentroIntervalo(dataBR, inicioBR, fimBR) {
  const d = paraDataComparavelBR(dataBR);
  const i = paraDataComparavelBR(inicioBR);
  const f = paraDataComparavelBR(fimBR);
  if (!d || !i || !f) return false;
  return d >= i && d <= f;
}

garantirArquivos();

/* =========================
   LOGIN / USUÁRIOS
========================= */

app.post("/api/login", (req, res) => {
  const { usuario, senha, setor } = req.body;
  const usuarios = lerJson(caminhoUsuarios);

  const user = usuarios.find(
    u => u.usuario === usuario && u.senha === senha && u.tipo === setor
  );

  if (!user) {
    return res.json({ sucesso: false, erro: "Usuário ou senha inválidos." });
  }

  res.json({
    sucesso: true,
    usuario: {
      usuario: user.usuario,
      setor: user.tipo
    }
  });
});

app.get("/api/usuarios", (req, res) => {
  res.json(lerJson(caminhoUsuarios));
});

app.post("/api/usuarios", (req, res) => {
  const { usuario, senha, tipo } = req.body;
  if (!usuario || !senha || !tipo) {
    return res.json({ sucesso: false, erro: "Preencha usuário, senha e tipo." });
  }

  const usuarios = lerJson(caminhoUsuarios);
  if (usuarios.find(u => u.usuario === usuario)) {
    return res.json({ sucesso: false, erro: "Usuário já existe." });
  }

  usuarios.push({ usuario, senha, tipo });
  salvarJson(caminhoUsuarios, usuarios);
  res.json({ sucesso: true });
});

app.delete("/api/usuarios/:usuario", (req, res) => {
  const usuario = req.params.usuario;
  const usuarios = lerJson(caminhoUsuarios);
  salvarJson(caminhoUsuarios, usuarios.filter(u => u.usuario !== usuario));
  res.json({ sucesso: true });
});

/* =========================
   CARDÁPIO
========================= */

app.get("/api/cardapio", (req, res) => {
  res.json(lerJson(caminhoCardapio));
});

app.post("/api/cardapio/itens", (req, res) => {
  const { categoria, novaCategoria, nome, descricao, preco, coluna, controlarEstoque, estoque } = req.body;
  const nomeCategoria = String(novaCategoria || categoria || "").trim();

  if (!nomeCategoria || !nome || !preco) {
    return res.json({ sucesso: false, erro: "Preencha categoria, nome e preço." });
  }

  const cardapio = lerJson(caminhoCardapio);
  let categoriaEncontrada = cardapio.find(c => c.nome.toLowerCase() === nomeCategoria.toLowerCase());

  if (!categoriaEncontrada) {
    categoriaEncontrada = {
      nome: nomeCategoria,
      coluna: coluna || "esquerda",
      itens: []
    };
    cardapio.push(categoriaEncontrada);
  }

  categoriaEncontrada.itens.push({
    id: Date.now(),
    nome: String(nome).trim(),
    descricao: descricao || "",
    preco: numeroSeguro(preco),
    esgotado: false,
    controlarEstoque: !!controlarEstoque,
    estoque: numeroSeguro(estoque)
  });

  salvarJson(caminhoCardapio, cardapio);
  io.emit("cardapioAtualizado");
  res.json({ sucesso: true });
});

app.put("/api/cardapio/itens/:id/esgotado", (req, res) => {
  const itemId = Number(req.params.id);
  const { esgotado } = req.body;
  const cardapio = lerJson(caminhoCardapio);

  let encontrado = false;

  for (const categoria of cardapio) {
    for (const item of categoria.itens) {
      if (Number(item.id) === itemId) {
        item.esgotado = !!esgotado;
        encontrado = true;
      }
    }
  }

  if (!encontrado) {
    return res.json({ sucesso: false, erro: "Item não encontrado." });
  }

  salvarJson(caminhoCardapio, cardapio);
  io.emit("cardapioAtualizado");
  res.json({ sucesso: true });
});

app.put("/api/cardapio/itens/:id", (req, res) => {
  const itemId = Number(req.params.id);
  const { nome, descricao, preco, categoria, coluna, controlarEstoque, estoque } = req.body;
  const cardapio = lerJson(caminhoCardapio);

  let itemEncontrado = null;
  let categoriaAntigaIndex = -1;
  let itemIndex = -1;

  for (let i = 0; i < cardapio.length; i++) {
    for (let j = 0; j < cardapio[i].itens.length; j++) {
      if (Number(cardapio[i].itens[j].id) === itemId) {
        itemEncontrado = cardapio[i].itens[j];
        categoriaAntigaIndex = i;
        itemIndex = j;
      }
    }
  }

  if (!itemEncontrado) {
    return res.json({ sucesso: false, erro: "Item não encontrado." });
  }

  cardapio[categoriaAntigaIndex].itens.splice(itemIndex, 1);

  let categoriaDestino = cardapio.find(c => c.nome.toLowerCase() === String(categoria).toLowerCase());
  if (!categoriaDestino) {
    categoriaDestino = {
      nome: categoria,
      coluna: coluna || "esquerda",
      itens: []
    };
    cardapio.push(categoriaDestino);
  }

  categoriaDestino.coluna = coluna || categoriaDestino.coluna;

  categoriaDestino.itens.push({
    id: itemEncontrado.id,
    nome: nome || itemEncontrado.nome,
    descricao: descricao || "",
    preco: numeroSeguro(preco),
    esgotado: itemEncontrado.esgotado || false,
    controlarEstoque: !!controlarEstoque,
    estoque: numeroSeguro(estoque)
  });

  salvarJson(caminhoCardapio, cardapio);
  io.emit("cardapioAtualizado");
  res.json({ sucesso: true });
});

/* =========================
   PEDIDOS
========================= */

app.get("/api/pedidos", (req, res) => {
  res.json(lerJson(caminhoPedidos));
});

app.post("/api/pedidos", (req, res) => {
  const pedidos = lerJson(caminhoPedidos);
  const agora = new Date();

  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const subtotalPedido =
    req.body.subtotalPedido != null
      ? numeroSeguro(req.body.subtotalPedido)
      : itens.reduce((soma, item) => soma + numeroSeguro(item.preco) * numeroSeguro(item.quantidade), 0);

  const taxaEntrega = numeroSeguro(req.body.taxaEntrega);
  const descontoValor = numeroSeguro(req.body.descontoValor);
  const totalPedido = Math.max(0, subtotalPedido + taxaEntrega - descontoValor);

  const novoPedido = {
    id: Date.now(),
    numeroPedido: gerarNumeroPedido(),
    cliente: req.body.cliente || "",
    mesa: req.body.mesa || "",
    telefone: req.body.telefone || "",
    endereco: req.body.endereco || "",
    garcom: req.body.garcom || "",
    origem: req.body.origem || "sistema",
    tipoPedido: req.body.tipoPedido || "mesa",
    observacao: req.body.observacao || "",
    itens,
    subtotalPedido,
    taxaEntrega,
    descontoValor,
    descontoPercentual: numeroSeguro(req.body.descontoPercentual),
    totalPedido,
    formaPagamento: req.body.formaPagamento || null,
    pagamentos: req.body.pagamentos || {},
    pago: !!req.body.pago,
    status: "Em andamento",
    statusVisual: "Em andamento",
    dataHora: formatarDataHoraBR(agora),
    dataDia: formatarDataBR(agora),
    dataHoraFinalizacao: null,
    dataHoraCancelamento: null,
    dataHoraEdicao: null,
    historico: [
      {
        dataHora: formatarDataHoraBR(agora),
        acao: "Pedido criado",
        detalhe: "Origem: " + (req.body.origem || "sistema")
      }
    ]
  };

  pedidos.unshift(novoPedido);
  salvarJson(caminhoPedidos, pedidos);

  io.emit("novoPedido", novoPedido);
  io.emit("pedidoAtualizado", novoPedido);

  res.json({ sucesso: true, pedido: novoPedido });
});

app.put("/api/pedidos/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { statusVisual } = req.body;
  const pedidos = lerJson(caminhoPedidos);
  const pedido = pedidos.find(p => Number(p.id) === id);

  if (!pedido) {
    return res.json({ sucesso: false, erro: "Pedido não encontrado." });
  }

  pedido.statusVisual = statusVisual || pedido.statusVisual;
  if (!Array.isArray(pedido.historico)) pedido.historico = [];
  pedido.historico.unshift({
    dataHora: formatarDataHoraBR(),
    acao: "Status alterado",
    detalhe: "Novo status: " + pedido.statusVisual
  });

  salvarJson(caminhoPedidos, pedidos);
  io.emit("pedidoAtualizado", pedido);
  res.json({ sucesso: true, pedido });
});

app.put("/api/pedidos/:id/editar", (req, res) => {
  const id = Number(req.params.id);
  const pedidos = lerJson(caminhoPedidos);
  const pedido = pedidos.find(p => Number(p.id) === id);

  if (!pedido) {
    return res.json({ sucesso: false, erro: "Pedido não encontrado." });
  }

  const itens = Array.isArray(req.body.itens) ? req.body.itens : pedido.itens;
  const subtotalPedido = itens.reduce((soma, item) =>
    soma + numeroSeguro(item.preco) * numeroSeguro(item.quantidade), 0
  );

  const taxaEntrega = numeroSeguro(req.body.taxaEntrega);
  const descontoPercentual = numeroSeguro(req.body.descontoPercentual);
  const valorDescontoPercentual = subtotalPedido * (descontoPercentual / 100);
  const totalPedido = Math.max(0, subtotalPedido - valorDescontoPercentual + taxaEntrega);

  pedido.cliente = req.body.cliente || "";
  pedido.telefone = req.body.telefone || "";
  pedido.endereco = req.body.endereco || "";
  pedido.garcom = req.body.garcom || pedido.garcom || "";
  pedido.tipoPedido = req.body.tipoPedido || "mesa";
  pedido.mesa = req.body.mesa || "";
  pedido.observacao = req.body.observacao || "";
  pedido.itens = itens;
  pedido.subtotalPedido = subtotalPedido;
  pedido.taxaEntrega = taxaEntrega;
  pedido.descontoPercentual = descontoPercentual;
  pedido.descontoValor = valorDescontoPercentual;
  pedido.totalPedido = totalPedido;
  pedido.dataHoraEdicao = formatarDataHoraBR();

  if (!Array.isArray(pedido.historico)) pedido.historico = [];
  pedido.historico.unshift({
    dataHora: formatarDataHoraBR(),
    acao: "Pedido editado",
    detalhe: "Itens ou dados alterados"
  });

  salvarJson(caminhoPedidos, pedidos);
  io.emit("pedidoAtualizado", pedido);
  res.json({ sucesso: true, pedido });
});

app.put("/api/pedidos/:id/finalizar", (req, res) => {
  const id = Number(req.params.id);
  const pedidos = lerJson(caminhoPedidos);
  const pedido = pedidos.find(p => Number(p.id) === id);

  if (!pedido) {
    return res.json({ sucesso: false, erro: "Pedido não encontrado." });
  }

  pedido.pagamentos = req.body.pagamentos || {};
  pedido.formaPagamento = req.body.formaPagamento || "Pagamento informado";
  pedido.pago = true;
  pedido.status = "Finalizado";
  pedido.statusVisual = "Finalizado";
  pedido.dataHoraFinalizacao = formatarDataHoraBR();

  if (!Array.isArray(pedido.historico)) pedido.historico = [];
  pedido.historico.unshift({
    dataHora: formatarDataHoraBR(),
    acao: "Pedido finalizado",
    detalhe: "Pedido encerrado"
  });

  salvarJson(caminhoPedidos, pedidos);
  io.emit("pedidoAtualizado", pedido);
  res.json({ sucesso: true, pedido });
});

app.put("/api/pedidos/:id/cancelar", (req, res) => {
  const id = Number(req.params.id);
  const pedidos = lerJson(caminhoPedidos);
  const pedido = pedidos.find(p => Number(p.id) === id);

  if (!pedido) {
    return res.json({ sucesso: false, erro: "Pedido não encontrado." });
  }

  pedido.status = "Cancelado";
  pedido.statusVisual = "Cancelado";
  pedido.dataHoraCancelamento = formatarDataHoraBR();

  if (!Array.isArray(pedido.historico)) pedido.historico = [];
  pedido.historico.unshift({
    dataHora: formatarDataHoraBR(),
    acao: "Pedido cancelado",
    detalhe: "Pedido cancelado"
  });

  salvarJson(caminhoPedidos, pedidos);
  io.emit("pedidoAtualizado", pedido);
  res.json({ sucesso: true, pedido });
});

/* =========================
   FECHAMENTO / RELATÓRIOS
========================= */

app.get("/api/fechamento-caixa", (req, res) => {
  const pedidos = lerJson(caminhoPedidos);
  const { data, dataInicio, dataFim } = req.query;

  let filtrados = [];

  if (data) {
    filtrados = pedidos.filter(p => p.dataDia === data);
  } else if (dataInicio && dataFim) {
    filtrados = pedidos.filter(p => dataDentroIntervalo(p.dataDia, dataInicio, dataFim));
  } else {
    return res.json({ sucesso: false, erro: "Informe data ou período." });
  }

  const finalizados = filtrados.filter(p => p.status === "Finalizado");
  const cancelados = filtrados.filter(p => p.status === "Cancelado");

  let totalDinheiro = 0;
  let totalPix = 0;
  let totalDebito = 0;
  let totalCredito = 0;
  let totalTaxaEntrega = 0;
  let totalDesconto = 0;

  finalizados.forEach(p => {
    totalDinheiro += numeroSeguro(p.pagamentos?.dinheiro);
    totalPix += numeroSeguro(p.pagamentos?.pix);
    totalDebito += numeroSeguro(p.pagamentos?.debito);
    totalCredito += numeroSeguro(p.pagamentos?.credito);
    totalTaxaEntrega += numeroSeguro(p.taxaEntrega);
    totalDesconto += numeroSeguro(p.descontoValor);
  });

  res.json({
    sucesso: true,
    data,
    dataInicio,
    dataFim,
    totalPedidos: filtrados.length,
    quantidadeFinalizados: finalizados.length,
    quantidadeCancelados: cancelados.length,
    totalVendido: finalizados.reduce((s, p) => s + numeroSeguro(p.totalPedido), 0),
    totalCancelado: cancelados.reduce((s, p) => s + numeroSeguro(p.totalPedido), 0),
    totalDinheiro,
    totalPix,
    totalDebito,
    totalCredito,
    totalTaxaEntrega,
    totalDesconto,
    pedidos: filtrados
  });
});

app.get("/api/relatorio-categorias", (req, res) => {
  const pedidos = lerJson(caminhoPedidos);
  const data = req.query.data;
  const categorias = String(req.query.categorias || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  if (!data || !categorias.length) {
    return res.json({ sucesso: false, erro: "Informe data e categorias." });
  }

  const totais = {};
  categorias.forEach(c => (totais[c] = 0));

  pedidos
    .filter(p => p.dataDia === data && p.status === "Finalizado")
    .forEach(pedido => {
      (pedido.itens || []).forEach(item => {
        if (categorias.includes(item.categoria)) {
          totais[item.categoria] += numeroSeguro(item.preco) * numeroSeguro(item.quantidade);
        }
      });
    });

  res.json({
    sucesso: true,
    data,
    categorias: totais,
    totalGeral: Object.values(totais).reduce((s, v) => s + v, 0)
  });
});

app.get("/api/itens-mais-vendidos", (req, res) => {
  const pedidos = lerJson(caminhoPedidos);
  const { dataInicio, dataFim } = req.query;

  let base = pedidos.filter(p => p.status === "Finalizado");
  if (dataInicio && dataFim) {
    base = base.filter(p => dataDentroIntervalo(p.dataDia, dataInicio, dataFim));
  }

  const ranking = {};

  base.forEach(pedido => {
    (pedido.itens || []).forEach(item => {
      if (!ranking[item.nome]) {
        ranking[item.nome] = {
          nome: item.nome,
          categoria: item.categoria || "Sem categoria",
          quantidade: 0,
          valor: 0
        };
      }

      ranking[item.nome].quantidade += numeroSeguro(item.quantidade);
      ranking[item.nome].valor += numeroSeguro(item.preco) * numeroSeguro(item.quantidade);
    });
  });

  res.json({
    sucesso: true,
    itens: Object.values(ranking).sort((a, b) => b.quantidade - a.quantidade)
  });
});

/* =========================
   MESAS
========================= */

app.get("/api/mesas", (req, res) => {
  res.json(lerJson(caminhoMesas));
});

app.post("/api/mesas", (req, res) => {
  const { numero, nome, ativa } = req.body;

  if (!numero) {
    return res.json({ sucesso: false, erro: "Informe o número da mesa." });
  }

  const mesas = lerJson(caminhoMesas);

  if (mesas.find(m => Number(m.numero) === Number(numero))) {
    return res.json({ sucesso: false, erro: "Já existe uma mesa com esse número." });
  }

  const novaMesa = {
    id: Date.now(),
    numero: Number(numero),
    nome: nome || ("Mesa " + numero),
    ativa: ativa !== false
  };

  mesas.push(novaMesa);
  mesas.sort((a, b) => Number(a.numero) - Number(b.numero));

  salvarJson(caminhoMesas, mesas);
  res.json({ sucesso: true, mesa: novaMesa });
});

app.put("/api/mesas/:id", (req, res) => {
  const id = Number(req.params.id);
  const { numero, nome, ativa } = req.body;

  const mesas = lerJson(caminhoMesas);
  const mesa = mesas.find(m => Number(m.id) === id);

  if (!mesa) {
    return res.json({ sucesso: false, erro: "Mesa não encontrada." });
  }

  if (numero && mesas.some(m => Number(m.numero) === Number(numero) && Number(m.id) !== id)) {
    return res.json({ sucesso: false, erro: "Já existe outra mesa com esse número." });
  }

  mesa.numero = Number(numero || mesa.numero);
  mesa.nome = nome || mesa.nome;
  mesa.ativa = ativa !== false;

  mesas.sort((a, b) => Number(a.numero) - Number(b.numero));

  salvarJson(caminhoMesas, mesas);
  res.json({ sucesso: true, mesa });
});

app.delete("/api/mesas/:id", (req, res) => {
  const id = Number(req.params.id);
  const mesas = lerJson(caminhoMesas);

  const novasMesas = mesas.filter(m => Number(m.id) !== id);

  if (novasMesas.length === mesas.length) {
    return res.json({ sucesso: false, erro: "Mesa não encontrada." });
  }

  salvarJson(caminhoMesas, novasMesas);
  res.json({ sucesso: true });
});

/* =========================
   BACKUP
========================= */

app.get("/api/backup", (req, res) => {
  const backup = {
    usuarios: lerJson(caminhoUsuarios),
    pedidos: lerJson(caminhoPedidos),
    cardapio: lerJson(caminhoCardapio),
    mesas: lerJson(caminhoMesas)
  };

  res.setHeader("Content-Disposition", "attachment; filename=backup.json");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(backup, null, 2));
});

app.post("/api/backup/restaurar", (req, res) => {
  const dados = req.body;
  if (!dados) {
    return res.json({ sucesso: false, erro: "Backup inválido." });
  }

  if (Array.isArray(dados.usuarios)) salvarJson(caminhoUsuarios, dados.usuarios);
  if (Array.isArray(dados.pedidos)) salvarJson(caminhoPedidos, dados.pedidos);
  if (Array.isArray(dados.cardapio)) salvarJson(caminhoCardapio, dados.cardapio);
  if (Array.isArray(dados.mesas)) salvarJson(caminhoMesas, dados.mesas);

  io.emit("pedidoAtualizado");
  io.emit("cardapioAtualizado");
  res.json({ sucesso: true });
});

/* =========================
   SOCKET
========================= */

io.on("connection", socket => {
  console.log("Cliente conectado");
  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando em http://localhost:" + PORT);
});