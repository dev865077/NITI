<!--
This is the complete NITI whitepaper converted from docs/whitepaper/index.html
for readable rendering on GitHub. Keep the HTML version and assets together.
-->

Esse Whitepaper receberá uma grande atualização brevemente. Você está lendo um rascunho.

# Niti: Non-custodial Interlinked Tokenization Infrastructure

_Versão RASCUNHO 0.1.1_

**Caleb Isaac**

_Sintéticos hipercolateralizados no Bitcoin através de Crédito Lombard via Discreet Log Contracts_

## 1. Problema

O bitcoin é frequentemente apontado como um forte candidato para
se tornar a moeda de reserva mundial. No entanto, embora tenha se
tornado um dos principais ativos utilizados para reserva de valor, ainda
não foi amplamente adotado como meio de troca. A explicação desse
fenômeno pode ser dividida em dois aspectos:

### 1.1 Paradoxo da Moeda

Derivado da Lei de Gresham, decorre o "Paradoxo da Moeda":

“*ceteris paribus*, agentes racionais preferem despender primeiro moedas com menor
potencial como reserva de valor enquanto acumulam as moedas com maior potencial como reserva de valor para trocas futuras.”

Por exemplo, se um agente racional do mercado receber metade do seu
salário em dólares e a outra metade em bolívares venezuelanos, sua
atitude racional seria gastar,
em ordem cronológica, os bolívares primeiro e reservar o dólar para
compras futuras, visto que este consegue, relativamente, manter seu
poder de compra
melhor através do tempo.

O bitcoin, sendo a moeda menos inflacionária em existência e a com mais
potencial como reserva de valor de longo prazo, tende a ser acumulado e
não gasto,
reduzindo sua utilização como meio de troca.

### 1.3 Dinheiro em Camadas

A utilização direta do bitcoin como reserva de valor e meio
de troca fere o conceito de Dinheiro em Camadas, elaborado
extensivamente no artigo
de Alan Schramm “Bitcoin, o sistema de liquidação final” e no
livro “Dinheiro em Camadas” de Nik Bhatia. O ouro não era utilizado na
sua forma
bruta como meio de troca, mas sim a partir de camadas que o
levariam a ser útil para ser usado como dinheiro.

Observando a evolução da utilização do ouro como base do
sistema monetário, é possível dividir em quatro camadas: a primeira
sendo o próprio
metal após extração, as pepitas de ouro em sua forma
original. A segunda camada é a padronização desse material em barras de
ouro que seguem
uma alta padronização de pureza, formato, medidas e pesagem. A
terceira passa a ser os certificados de ouro, onde essas barras, de
difícil
transporte e divisibilidade, eram “tokenizadas” em
certificados de posse, o que aumentava em muito o potencial da
utilização de ouro como
meio de troca, embora necessitasse de custódia de terceiros. A
quarta camada eram as notas bancárias como era conhecido antes do fim
do
padrão-ouro, lastreadas nesses certificados que circulavam em
massa.

Cada uma dessas camadas possui atributos diferentes e focos
distintos para exercer suas funções. A visão de que o bitcoin em sua
forma crua
maximizaria todas as características necessárias de um
sistema monetário (reserva de valor, meio de troca e unidade de
contagem) não condiz
com a história do dinheiro na humanidade.

Se quisermos que bitcoin seja utilizado como meio de troca, é
preciso reconhecer o Paradoxo da Moeda e o conceito de Dinheiro em
Camadas
para que seja criado um sistema monetário com base no bitcoin
que atende às necessidades do mercado.

## 2. Soluções Atuais

### 2.1 Stablecoins Centralizadas (IOU)

As stablecoins IOU são ativos digitais que derivam seu valor por
serem lastreadas por reservas de moeda fiduciária ou outros ativos
tradicionais
mantidos por uma entidade centralizada. Exemplos incluem Tether
(USDT), USD Coin (USDC) e DePix. Essas stablecoins são essencialmente
notas
promissórias tokenizadas emitidas por empresas privadas, ou
seja, carregam um risco significativo de contraparte pois você perde a
custódia
dos seus bitcoins e deve confiar que o emissor está mantendo
honestamente reservas completas e que resgatará os tokens conforme
prometido.

Casos anteriores de falta de transparência e auditorias
incompletas corroeram essa confiança com golpes e mau uso do colateral,
provocando perda
de paridade do token. Além disso, essas stablecoins
centralizadas estão sujeitas a regulamentações governamentais e podem
ser censuradas ou
encerradas a qualquer momento.

Apesar dos problemas citados, elas são utilizadas em larga escala: o Tether (USDT) é a terceira maior
criptomoeda em existência, e é muito utilizado como meio de troca em países de terceiro mundo como um dólar tokenizado.

### 2.2 Stablecoins Algorítmicas

Em contraste com as Stablecoins IOU, que reintroduzem o risco
centralizado de contraparte, as Stablecoins Algorítmicas não possuem
emissor centralizado ou
reservas fiduciárias. Elas são lastreadas por um ativo digital, e a
conversão é mediada por smart contracts. Alguns exemplos são o USD da
10101, MakerDAO
e TerraUSD.

Apesar delas possuírem claras vantagens em relação a
stablecoins IOU, possuem um enorme custo a mais: a hipercolaterização.
Todas essas
moedas requerem lastro em ativos maior do que o valor da stablecoin fiat
gerada. Além disso, o usuário precisa ter o conhecimento técnico do
algoritmo
específico usado para manter essa paridade, que é diferente em cada
moeda, e também conhecimento sobre qual é o ativo digital utilizado como
lastro.

Dessa forma, para o usuário comum, a percepção de risco é alta, pois
esses empreendimentos não seguem um protocolo padrão com um ativo padrão
como reserva.
No caso da TerraUSD o risco era tão alto que entrou em colapso: a
garantia usada eram ativos digitais fracos com valor atrelado ao
protocolo.
Para esse usuário, utilizar uma solução centralizada e legalizada é mais
seguro do que uma desconhecida a ele, embora com um mecanismo
supostamente mais
seguro.

Para o usuário comum, esse custo é muito maior do que os benefícios de
se utilizar uma stablecoin centralizada, que possui um custo de 1:1, ao
invés
de um custo de, vamos supor, 2:1 necessário para gerar a
hipercolaterização das stablecoins algorítmicas. O usuário comum prefere
tomar o risco temporário
da Tether não sucumbir ao invés de despender capital para a criação do
lastro. Todo o foco desses protocolos está em criar moedas fiats e
competir
diretamente com IOUs, usando os seus próprios mecanismos, o que
acreditamos não ser uma estratégia viável de mercado.

A NITI possui outra estratégia: criar um protocolo universal para
criação de stablecoins pelos próprios usuários, focado em ativos que
stablecoins
centralizadas não conseguem criar.

### 2.3 A Proposta da Niti

A NITI propõe implementar o sistema
monetário proposto por Hayek em 1976, em “Desestatização do Dinheiro”,
criando uma
plataforma onde diversas stablecoins possam concorrer livremente,
seguindo todas o mesmo protocolo para garantir sua qualidade.

#### 2.3.1 O Modelo Monetário de Hayek e a Implementação pela NITI

Em seu livro "A Desestatização do Dinheiro", publicado em 1976, o
economista Friedrich Hayek propôs um novo sistema financeiro.
Ele argumentou que o monopólio estatal sobre a emissão de moeda é a raiz
de muitos problemas econômicos, como inflação, ciclos de boom e bust, e
crises
monetárias. Hayek defendeu que a solução seria permitir a livre
concorrência na emissão de moedas privadas.

Nesse modelo, instituições privadas poderiam emitir suas próprias
moedas, que circulariam livremente no mercado. Os usuários escolheriam
usar as moedas
que considerassem mais estáveis e confiáveis. As moedas que não
mantivessem seu valor perderiam a confiança do público e seriam
abandonadas em favor de
alternativas melhores.

Segundo Hayek, esse sistema de concorrência monetária levaria a moedas
mais estáveis e adequadas às necessidades do mercado. As instituições
emissoras
teriam fortes incentivos para manter o valor de suas moedas, pois sua
reputação e negócios dependeriam disso. Elas buscariam atender às
demandas dos
usuários por moedas com diferentes características, como maior ou menor
estabilidade, lastro em diferentes ativos, etc.

A NITI propõe implementar esse modelo de Hayek usando a tecnologia dos
Discreet Log Contracts (DLCs) no Bitcoin. Através dos DLCs, qualquer
pessoa ou
instituição poderá criar stablecoins algorítmicas (chamadas de
"sintéticos" na NITI) lastreadas em uma ampla variedade de ativos, muito
além do que
as stablecoins tradicionais atreladas a moedas fiduciárias podem
oferecer.

Esses sintéticos poderão ter seu valor atrelado a commodities, ações,
índices, taxas ou qualquer ativo que tenha um preço publicamente
verificável.
Cada emissor poderá escolher a cesta de ativos que lastreará seu
sintético, buscando atender a nichos específicos do mercado. Os
usuários,
por sua vez, poderão escolher usar os sintéticos que melhor atendam suas
necessidades de estabilidade, hedge, exposição a determinados setores,
etc.

Diferentemente das stablecoins algorítmicas atuais, que têm seus
próprios mecanismos complexos e arriscados de estabilização,
todos os sintéticos na NITI seguirão um mesmo modelo padrão usando DLCs.
Isso trará transparência, segurança e facilidade de uso para os
usuários.
Eles saberão que todos os sintéticos, independente do emissor, seguem a
mesma lógica de funcionamento.

Portanto, a NITI busca criar as bases tecnológicas para viabilizar na
prática o modelo de concorrência monetária descrito por Hayek.
Será um grande avanço rumo à desestatização do dinheiro vislumbrada por
Hayek décadas atrás.

#### 2.3.2 Diversidade de tokens

Ao invés de competir diretamente com IOUs,
nossa proposta é implementar algo que elas são incapazes de fazer pela
natureza
do seu sistema: a diversidade de tokens. A Tether possui reservas
diretas para seu lastro e isso é possível porque existe alta liquidez no
mercado
tradicional para Dólar, contratos futuros, títulos, etc. Entretanto,
se quisessem criar um token que copia o valor do Diesel, o que seria
muito
útil para caminhoneiros possuírem um hedge contra seus custos,
encontrariam dificuldades. Podem tentar utilizar estoques do combustível
como lastro,
mas isso possui altos custos e inviabilizaria a monetização dessa
reserva. Seria até possível usar uma cesta dinâmica de ativos
tradicionais para
simular esse preço, mas é possível observar como esse sistema
aumentaria rapidamente em complexidade e reduziria a lucratividade.

No caso de criar uma stablecoin que tem
paridade com a variação na taxa de transação (sat/vB) do Bitcoin, não
existem
instrumentos legais no mercado financeiro tradicional para criar essa
reserva ou monetizar ela. Esse tipo de stablecoin não pode ser criado
por
IOUs, e acreditamos que é nesse tipo de ativo que as stablecoins
algorítmicas tem vantagem competitiva.

Os sintéticos da Niti podem ter paridade com
variações de clima, volume de safras, acontecimentos políticos, taxas
de
transação no Bitcoin, médias de preço (Ex.: Preço médio do Bitcoin em
200 semanas), índices de ações e qualquer outro ativo que possui dados
públicos
e fontes de informação confiáveis e aceitas pelas duas partes do
contrato. Diferentemente de stablecoins IOU, seus sistema não depende de
lastro direto,
mas apenas de um contrato privado entre duas partes que utilizam
bitcoin como lastro, permitindo que sejam criados sintéticos específicos
para usos
de casos peculiares. A Niti encontrou esse vazio no mercado, visto
que, embora as stablecoins algorítmicas tenham a capacidade técnica de
gerar tokens
de qualquer coisa que possua preços públicos, elas focam em copiar
moedas fiat e competir com stablecoins IOU.

#### 2.3.3 Padronização

As stablecoins algorítmicas apresentam uma
complexidade alta aos usuários por seguirem seus protocolos
individuais, que podem ser falhos, como foi o caso da TerraUSD. O
usuário então precisa estudar especificamente aquele processo em
profundidade para conhecer esses riscos e analisar economicamente a
viabilidade da paridade dos tokens oferecidos. Isso é inviável ao
usuário comum, que na prática toma um alto risco ao participar de um
sistema que ele não conhece e é único para aquele protocolo.

Na
solução proposta por Hayek, moedas privadas diversas concorreriam
livremente no mercado privado. Ele argumenta que nossa visão sobre
utilizar uma única moeda é baseada no costume com o monopólio estatal e
que deveríamos usar vários sintéticos (stablecoins sem lastro direto),
baseados em variadas cestas de ativos para os diferentes usos do
dinheiro. A Niti tem o objetivo de trazer esse sistema à vida, mais de
50 anos depois de sua concepção. Por isso, a Niti em si não é um banco
oferecendo stablecoins, mas sim um protocolo onde agentes de mercado
podem utilizar para criar suas próprias stablecoins, que necessariamente
precisam aderir ao modelo do protocolo.

Dessa
forma, utilizando empresas que seguem o protocolo NITI para criar essas
stablecoins, o cliente sabe que está utilizando uma plataforma segura,
independentemente de qual token ele está comprando. Com a padronização
de stablecoins algorítmicas, é reduzido em muito a complexidade e a
percepção de risco para o cliente. TerraUSD jamais poderia operar na
NITI, pois seu sistema não seguiria o protocolo padrão aceito e
conhecido por todos. A Niti usa a Estratégia do Oceano Azul para criar
uma proposta de valor ainda não utilizada por stablecoins algorítmicas.

#### 2.3.4 A Estratégia do Oceano Azul da NITI

Segundo KIM e MAUBORGNE (2008),
estratégias de oceano azul buscam criar espaços de mercados não
disputados, em contraponto a concorrência em um espaço existente. Foca
em tornar a concorrência irrelevante, e não se preocupa necessariamente
em vencê-la, pois a empresa que utiliza a estratégia do oceano azul
concorre por clientes diferentes, em um mercado mais expandido, com
propostas de valor diferentes do que é encontrado no mercado.
As ferramentas utilizadas nesta pesquisa consistem na Matriz de
Avaliação de Valor, que serve como base para o diagnóstico da empresa e
como modelo para desenvolvimento de uma nova estratégia; o Modelo das
quatro ações, utilizado para questionar o modelo de negócios utilizado
pelos concorrentes e propor mudanças na curva de valor da empresa; e a
Matriz de eliminar-reduzir-elevar-criar, um modelo complementar ao
modelos das quatro ações e comunicar as ações necessárias para alcançar a
nova curva de valor proposta pela estratégia.

#### 2.3.4 Análise Atual

## Matriz de Avaliação de Valor

![DLC](docs/whitepaper/assets/matriz1.png)

## Modelo das Quatro Ações

De acordo com as quatro perguntas estratégicas desenvolvidas por Kim
e Mauborgne (2008), é essencial determinar quais atributos do setor
devem
ser alterados:

Que atributos considerados indispensáveis pelo setor devem ser eliminados?

A Niti elimina a separação individual dos serviços de tokenização,
atuando como um protocolo e infraestrutura tecnológica que permite
a outros agentes criar e monetizar seus próprios sintéticos.
Diferentemente de plataformas como MakerDAO, que operam com sistemas
proprietários,
a Niti se posicionará como uma plataforma aberta, permitindo que
outros operem sobre ela. Atualmente, todos os fornecedores de
stablecoins
desenvolvem seus próprios contratos inteligentes e restringem o
acesso às suas plataformas. A Niti eliminará essa barreira, promovendo
uma
abertura total.

Que atributos devem ser reduzidos bem abaixo dos padrões setoriais?

A Niti planeja reduzir significativamente o Capital Expenditure
(CapEx) em comparação com outras stablecoins algorítmicas, além de
diminuir
a quantidade de ativos digitais necessários para estabelecer o
lastro das stablecoins. A plataforma utilizará exclusivamente Bitcoin
como lastro,
simplificando o processo e reduzindo os custos operacionais.

Que atributos devem ser elevados bem acima dos padrões setoriais?

A facilidade de uso será consideravelmente aprimorada, uma vez que a
padronização facilitará a escolha entre diferentes emissores de moedas
pelos usuários. A Niti visa alcançar um amplo mercado de usuários,
incluindo setores fora do escopo tradicional, como agricultores e
industriais.
Além disso, a diversidade de ativos será significativamente
expandida. O foco não será competir diretamente com stablecoins IOU, mas
sim oferecer
uma vasta gama de sintéticos com diversas paridades de preços. A
interligação de DLCs também permitirá a criação de uma maior variedade
de
instrumentos financeiros complexos, disponibilizando novas
ferramentas para o mercado.

## Nova Curva de Valor

![DLC](docs/whitepaper/assets/matriz2.png)

## 3. Modelo

O processo de criação de stablecoins envolve 4 participantes:
Cliente, Oráculo, Banco e NITI. O Banco representa um node da Lightning
Network,
o cliente é o usuário final que deseja utilizar a stablecoins, o
oráculo a fonte de informação do mundo externo e a NITI o protocolo e
infraestrutura
que todos utilizam.

### 3.1 Discreet Log Contracts

Discreet Log Contracts (DLCs) são um tipo de smart contract no
Bitcoin que permite que duas partes façam apostas ou acordos de forma
privada,
utilizando dados do mundo real para determinar o resultado. Seu
funcionamento é similar ao da Lightning Network, mas sua função é, ao
invés de criar
canais de micropagamentos *off-chain*, criar canais de pagamentos condicionais.

![DLC](docs/whitepaper/assets/modeloDLC.svg)

Fonte: Interdax, “Discreet Log Contracts: Scalable Smart Contracts for Bitcoin”

DLCs usam um modelo similar à Lightning Network, mas ao invés de
serem utilizados para pagamentos genéricos através de um canal de
pagamentos,
eles utilizam um canal para pagamentos condicionais, que
dependem de um dado externo para serem executados.
Alice e Bob mantém a custódia de seus Bitcoins, de forma análoga a um
canal da Lightning Network, e a apenas uma das milhares de transações
pré-assinadas por ambos pode ser executada, aquela na qual a assinatura
do oráculo confirma o resultado da aposta (seja preço, acontecimento
político, climático, etc.). A primeira aposta em DLCs ocorreu entre dois
importantes nomes do ecossistema Bitcoin: o criador do BTC Pay Server
e o co-fundador da Suredbits. Eles apostaram no resultado das eleições
presidenciais americanas de 2020.

### 3.2 Como a NITI utiliza DLCs para implementar o sistema monetário de Hayek

A NITI não é Alice, nem Bob, nem o Oráculo. A NITI atua com uma
coordenadora entre todas essas partes, fornecendo a infraestrutura
tecnológica
para que a Alice e Bob consigam se encontrar e escolher um oráculo com
alta reputação. Isso envolve superar um dos desafios citados no
Whitepaper
do Discreet Log Contracts: “Decentralized Matching“, ou Pareamento
Descentralizado.

#### 3.2.1 Pareamento Descentralizado

A
NITI utiliza protocolos descentralizados de comunicação
, como o Nostr, para facilitar o pareamento entre as partes
interessadas em criar um contrato DLC (Alice e Bob) e o oráculo que
fornecerá os dados
externos necessários para a execução do contrato.

O
Nostr (Notes and Other Stuff Transmitted by Relays) é um protocolo
aberto e descentralizado para comunicação online. Ele permite que
os usuários publiquem conteúdo, interajam e troquem mensagens de forma
segura
e privada, sem depender de plataformas centralizadas. No Nostr, os
usuários mantêm controle total sobre sua identidade e dados, utilizando
criptografia de chave pública.

Através
do Nostr, Alice e Bob podem publicar de forma criptografada suas
intenções de fazer um contrato, especificando os termos
desejados (ativo, data de expiração, faixa de preço, etc). Esses
anúncios ficam
visíveis para outros usuários do Nostr, que podem então
manifestar interesse caso tenham intenção compatível. Uma vez que
Alice e Bob se encontrem e verifiquem que seus interesses são
complementares, eles podem então prosseguir com a criação do contrato
DLC propriamente dito.

Além
disso, a NITI mantém uma lista de oráculos confiáveis no Nostr, oráculos
que publicam periodicamente seus dados de forma permanente,
tendo sua reputação baseada na precisão e na frequência com que esses
dados são transmitidos. Alice e Bob podem então escolher
em conjunto um desses oráculos para fornecer os dados externos
necessários
para a execução do contrato DLC. Essa escolha é crucial,
pois a integridade e precisão dos dados fornecidos pelo oráculo são
fundamentais para o bom funcionamento do contrato.

Todo
esse processo de pareamento acontece de
forma descentralizada, sem que Alice e Bob precisem
confiar suas informações a intermediários. O Nostr atua apenas como um
intermediador, permitindo que as partes se encontrem e
escolham um oráculo de forma eficiente e privada.

Além de facilitar o pareamento descentralizado entre Alice, Bob e um
oráculo mutuamente confiável, o protocolo Nostr também permite que a
Niti a
interligação de múltiplos Discreet Log Contracts (DLCs) em sequência
ou cascata. Essa arquitetura possibilita a criação de instrumentos
financeiros
complexos e automatizados no Bitcoin.

A ideia central é que o resultado verificado de um DLC possa servir
automaticamente
como gatilho para um próximo DLC pré-configurado pelas partes, criando
assim uma cadeia
de contratos condicionalmente interligados. Considerando um exemplo
prático, suponha que
Alice e Bob configuram um primeiro DLC onde o resultado depende da
variação do valor do
dólar em relação ao bitcoin (BTCUSD) em um determinado período. Eles
antecipadamente configuram um conjunto de transações potenciais
T = {T1, T2, ..., Tn} usando Adaptor Signatures, onde cada transação Ti
corresponde a um intervalo possível de variação do BTCUSD,
codificado na condição Ci.

Ao final do período estipulado, o oráculo assina o resultado observado,
por exemplo, Ck = "BTCUSD variou entre 10% e 20%". A Niti,
atuando como coordenadora, publica essa mensagem assinada pelo oráculo
no Nostr. Alice e Bob podem então derivar a chave privada
correspondente à transação vencedora Tk através da fórmula:

![DLC](docs/whitepaper/assets/form1.png)

onde
α e β são os segredos privados de Alice e Bob, respectivamente, e H é
uma função hash criptográfica. Supondo que Alice e Bob desejem ativar um
segundo
DLC se o resultado Ck for observado, eles preparam um novo conjunto S =
{S1, S2, ..., Sm} de transações potenciais para esse segundo DLC, onde
cada Sj
representa uma compra periódica de bitcoin. As chaves públicas dessas
transações são derivadas incorporando a condição Ck do primeiro DLC:

![DLC](docs/whitepaper/assets/form2.png)

onde G é um gerador da curva elíptica, α' e β' são novos segredos, e Dj
codifica os detalhes da compra periódica.

Quando a Niti publica a mensagem assinada com o resultado Ck no Nostr,
Alice e Bob podem derivar a chave privada de uma transação
Sj específica e ativar o segundo DLC:

![DLC](docs/whitepaper/assets/form3.png)

Este processo pode ser repetido, encadeando múltiplos Discreet Log
Contracts (DLCs) onde o resultado publicado pela Niti de um contrato
serve como
condição pré-imagem para ativar o próximo na cadeia, tudo operando de
forma descentralizada via mensagens assinadas no Nostr. A Niti não
intermedia
a execução dos DLCs individuais, mas facilita a publicação dos
resultados assinados pelo oráculo, permitindo que Alice e Bob ativem
novos DLCs na cadeia
conforme necessário. Esta combinação de DLCs com Adaptor Signatures e
Nostr abre caminho para a construção de uma rede descentralizada de
contratos
financeiros programáveis diretamente na camada base do Bitcoin.

#### 3.2.3 Uso de Colaterais Múltiplos para DLCs

Em
DLCs, é comum utilizar apenas um ativo digital
como colateral, especialmente o bitcoin. Porém, a Niti emprega
Lombard Loans (Créditos Lombard) que permitem o uso de uma cesta
diversificada de
ativos sintéticos lastreados em Bitcoin como colateral.

Essa abordagem traz vantagens
significativas, pois o Bitcoin é um ativo extremamente volátil. Ao
diversificar
o colateral com outros ativos sintéticos descorrelacionados, como
ouro, dólar, ações etc., a volatilidade total da cesta de colateral
é reduzida, mitigando o risco de chamadas de margem.

##### 3.2.3.1 Lombard Credit

Os Lombard Loans, ou Créditos Lombard, são
uma modalidade tradicional de empréstimo onde ativos líquidos são
utilizados como garantia ou colateral. Tradicionalmente oferecidos
por bancos privados a clientes de alta renda, os Lombard Loans permitem
que os tomadores de empréstimo acessem liquidez sem precisar vender
seus ativos.

No mercado tradicional, um Lombard Loan
funciona da seguinte forma: O cliente utiliza seus ativos (ações,
títulos, fundos etc.)
como colateral para o empréstimo. O banco então empresta uma
quantia em dinheiro com base em uma porcentagem do valor desses ativos
dados em garantia.
O cliente paga juros periódicos sobre o valor emprestado. Se o
valor dos ativos dados em colateral cair abaixo de um limite
pré-determinado em relação
ao valor do empréstimo, ocorre uma chamada de margem. Nesse caso,
o cliente precisa depositar mais ativos como colateral para recompor a
margem
de garantia exigida pelo banco. Se o cliente não conseguir
recompor essa margem, o banco executa ou liquida os ativos dados
inicialmente como
colateral para quitar o empréstimo.

Na plataforma Niti, os Lombard Loans são a base para a geração de sintéticos lastreados em múltiplos ativos. Por exemplo,
Alice pode usar uma combinação de:

- 1/3 de um Sintético de Ouro
- 1/3 de um Sintético de Dólar
- 1/3 de Bitcoin

como colateral para criar
um Sintético de Real através de um DLC. Sua diversificação ajuda a
suavizar a volatilidade da cesta de colateral. Se o preço do Bitcoin
cair
bruscamente, mas o ouro e dólar se mantiverem estáveis, o valor
total do colateral de Alice não será tão impactado. Isso reduz
significativamente
a probabilidade de uma chamada de margem forçar o encerramento
prematuro de seu contrato de Sintético de Real.

Além disso, os usuários podem criar cestas de colateral
personalizadas que melhor se adequem ao seu perfil de risco e
expectativas para o contrato
específico.

Em análises de
Value-at-Risk (VaR), foi possível quantificar os benefícios da
diversificação na redução
de risco ao se utilizar múltiplos ativos como colateral.
Utilizando apenas Bitcoin como colateral, usando 1 dia como período,
99% de confiança e dados diários a partir de 2014, a
quantidade em risco de ser perdida é de 8,25%. Com apenas dólar como
colateral,
é 1,81% e com apenas ouro é 2,14%. Agora, utilizando os 3
ativos em conjunto, na proporção de 1/3 cada, encontra-se o menor risco
de todos:
apenas 1%. Embora pareça contra intuitivo, isso ocorre
porque o preço desses ativos tem baixa correlação: tendem a subir e
descer
em períodos separados. Ou seja, fica matematicamente
determinado que é 8 vezes mais seguro utilizar múltiplos ativos como
colateral
do que apenas o Bitcoin.

## 4. Usos de Caso

### 4.1 Real Sintético

Utilizando os Discreet Log Contracts (DLCs), o Niti permite a criação de
stablecoins que replicam o valor de moedas fiduciárias como o Real
brasileiro. Esta aplicação é particularmente útil em mercados onde a
volatilidade ou a desvalorização da moeda local faz com que a
estabilidade
oferecida por uma criptomoeda atrelada ao valor de moedas mais estáveis
seja atraente.

### 4.2 DCA Descentralizado

A estratégia de Dollar Cost Averaging (DCA) é facilitada pelo uso de
DLCs interligados no protocolo Niti, permitindo compras periódicas
automatizadas de Bitcoin ou outras criptomoedas. Este sistema
configura um novo DLC periodicamente, onde o preço do ativo é
determinado pelo
resultado do DLC anterior.

### 4.3 Ações Sintéticas

Niti também possibilita a criação de sintéticos que simulam o
desempenho de ações ou índices do mercado acionário. Esses sintéticos
são criados
e gerenciados através de DLCs, permitindo aos usuários exposição a
diferentes mercados financeiros sem a necessidade de converter
diretamente
suas criptomoedas em moedas fiduciárias ou investir diretamente em
mercados externos.

### 4.4 Renda passiva em Bitcoin

Através do uso de múltiplos ativos como colateral, a Niti permite
não apenas a criação de sintéticos, mas também seu aluguel para outros
usuários.
Isso cria uma oportunidade de renda passiva para os detentores de
Bitcoin que desejam monetizar seus ativos sem vendê-los, alugando-os
como garantia em contratos de DLC.

### 4.5 Apostas P2P

O protocolo Niti utiliza Discreet Log Contracts (DLCs) para
organizar apostas peer-to-peer (P2P) em uma variedade de eventos, como
esportivos,
políticos ou outros acontecimentos marcantes. Isso permite que os
usuários façam apostas diretamente entre si, sem a necessidade de casas
de
apostas ou outros intermediários. Ao empregar oráculos para
confirmar os resultados dos eventos, o protocolo garante que as apostas
sejam
resolvidas de forma justa e transparente. Por exemplo, em uma aposta
esportiva, usuários podem apostar no resultado de uma partida de
futebol;
em uma aposta política, o foco pode ser o resultado de eleições.
Cada aposta é assegurada por contratos inteligentes que só liberam o
pagamento
quando o resultado é oficialmente confirmado pelo oráculo.

### 4.7 Hedge Simplificado

Um fazendeiro enfrenta diversos custos variáveis em sua operação, como combustíveis, fertilizantes, sementes,
ração animal entre outros. Esses insumos possuem preços negociados publicamente em mercados de commodities.

Através da Niti,
o fazendeiro pode comprar um conjunto de sintéticos que acompanham os preços desses insumos em uma proporção específica.
Por exemplo:

- 30% Sintético Diesel
- 25% Sintético Soja
- 20% Sintético Fertilizante Nitrogenado

- 15% Sintético Milho

- 10% Sintético Fosfato

Esse conjunto de sintéticos formaria um hedge simplificado
contra as principais fontes de custo variável da fazenda.
À medida que os preços desses insumos oscilam, o valor dos sintéticos
correspondentes também flutua, proporcionando um hedge natural.

O fazendeiro não precisa negociar diretamente esses ativos nos
mercados tradicionais de commodities. Através dos DLCs da Niti, ele pode
obter
exposição facilitada a uma cesta personalizada desses ativos,
lastreada em bitcoin.

Além disso, como os sintéticos são
negociados de
forma descentralizada ponto-a-ponto, o fazendeiro mantém custódia de
seus fundos durante todo o processo, sem precisar repassá-los a
uma contraparte centralizada.

Esse tipo de hedge simplificado
e sem custódia seria muito difícil ou caro de ser obtido nos mercados
financeiros tradicionais para um pequeno produtor rural. Porém, a
Niti permite que até mesmo fazendeiros possam construir estratégias
personalizadas de proteção contra oscilações de preço de forma
prática e econômica.

A capacidade de criar sintéticos lastreados
em praticamente qualquer ativo com preço público torna a Niti uma
solução poderosa para gerenciamento de risco em diversos setores, não
apenas
financeiro. Produtores, empresas e até mesmo pessoas físicas podem
montar suas próprias cestas de hedge de acordo com suas necessidades
específicas.

## 5. Referências

- Dryja, T. (2018). Discreet Log Contracts. Whitepaper. Disponível em: [https://adiabat.github.io/dlc.pdf](https://adiabat.github.io/dlc.pdf)

- Schramm, A. Bitcoin, o sistema de liquidação final. Artigo. Disponível em: [https://livecoins.com.br/bitcoin-sistema-de-liquidacao-final/](https://livecoins.com.br/bitcoin-sistema-de-liquidacao-final/)

- Bhatia, N. Dinheiro em Camadas. Livro.

- Hayek, F. A. (1976). A Desestatização do Dinheiro. Livro.

- Aristófanes. Obras completas. Referência específica sobre o uso de moedas na Grécia Antiga.

- Kim, W. C., & Mauborgne, R. (2005). Blue Ocean Strategy. Harvard Business Review Press.

- Credit Suisse. Lombard Loans. Disponível em: [https://www.credit-suisse.com/ch/en/private-clients/investments/lombard-loan.html](https://www.credit-suisse.com/ch/en/private-clients/investments/lombard-loan.html)

- Investopedia. Gresham's Law. Disponível em: [https://www.investopedia.com/terms/g/greshams-law.asp](https://www.investopedia.com/terms/g/greshams-law.asp)
