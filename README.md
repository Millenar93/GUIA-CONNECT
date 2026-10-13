# Guia Connect

Protótipo interativo de um guia municipal para Caraguatatuba/SP. HTML, CSS e JavaScript puro, sem build ou dependências locais.

## Como testar

Na pasta do projeto, execute:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Abra o endereço do servidor na porta 8000 em seu navegador. Use um servidor HTTP: módulos JavaScript não funcionam adequadamente abrindo o HTML via `file://`.

## Fluxos disponíveis

- Boas-vindas, escolha cliente/empresa e formulários demonstrativos sem senha. A sessão é mantida apenas na memória.
- Mapa Leaflet/OpenStreetMap com marcadores de oito lugares fictícios, pesquisa e seis categorias. Se o mapa externo não carregar, use a lista.
- Localização solicitada ao entrar no mapa, marcador “Você está aqui”, círculo de precisão e botão de recentralização. Recusa, erro ou indisponibilidade permitem escolher um ponto manual ou explorar Caraguatatuba. A posição do usuário não é salva.
- Detalhes em painel sobre o mapa, com meia tela no celular, expansão e fechamento; cardápio com preços fictícios e informações específicas por categoria.
- Favoritos, preferências e avaliações de teste persistidos no dispositivo; recomendações editoriais identificadas quando faltam notas; Top 10 por categoria calculado apenas com avaliações locais; perfil com confirmação para apagar dados locais.
- Painel empresarial: escolha Sou empresa e entre com nome/e-mail fictícios. Edite o primeiro estabelecimento, incluindo coordenadas, foto, canais pertinentes e informações por categoria, pré-visualize e salve no navegador. Nenhuma alteração é publicada.
- Somente canais disponíveis e pertinentes são exibidos, com validação de HTTPS e domínio da plataforma quando aplicável. Links ausentes são identificados; mapas apontam apenas para coordenadas ilustrativas. A validação de URL não comprova propriedade, disponibilidade ou autenticidade do destino.

Todos os estabelecimentos, coordenadas, horários, programação e preços são ilustrativos. Não existem pagamentos, reservas próprias, avaliações reais ou autenticação segura. Não insira dados pessoais. As imagens são ilustrativas, fornecidas pelo Unsplash.

## Organização

- `index.html`: estrutura e carregamento.
- `styles.css`: identidade visual e adaptação para celular/computador.
- `js/data.js`: categorias e dados substituíveis.
- `js/app.js`: rotas, interface, mapa e estado local.
- `js/discovery.js`: busca, cálculo de distância, médias de teste e ranking.
- `tests/discovery.test.mjs`: testes das regras de descoberta e ranking, executáveis com `node --test tests/discovery.test.mjs`.

Leaflet 1.9.4 é distribuído localmente em `vendor/leaflet`, com sua licença original. Mapa, imagens e fontes usam serviços externos. Fontes têm fallback local; o mapa tem fallback para a lista. Fotos indisponíveis são substituídas por uma ilustração local.

## Próximas etapas

Autenticação real requer serviço seguro de identidade, recuperação de conta e autorização por perfil. Um backend e banco de dados deverão validar, moderar e publicar cadastros empresariais, proteger dados e registrar consentimentos. Para PWA, adicionar manifest, ícones e service worker com política de cache; avaliar regras de uso dos mapas antes de cache offline. Para aplicativo nativo, reaproveitar dados e fluxos após definir a arquitetura.

## Publicar no GitHub Pages

1. Abra o repositório `Millenar93/GUIA-CONNECT` no GitHub.
2. Vá a **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **Deploy from a branch**.
4. Selecione a branch **main** e a pasta **/ (root)**, e clique em **Save**.
5. Aguarde o deploy; a página Settings → Pages mostrará o endereço publicado e o botão **Visit site**.

O endereço esperado é `https://millenar93.github.io/GUIA-CONNECT/`. Ele só estará disponível depois da ativação e conclusão do deploy. Não é necessário domínio próprio, chave de API ou comando de build. Os caminhos dos arquivos são relativos, compatíveis com a subpasta do GitHub Pages. O arquivo `.nojekyll` permite servir diretamente os arquivos estáticos.

Se o Pages não estiver disponível para um repositório privado no seu plano, será necessário escolher uma opção de hospedagem compatível ou decidir se deseja tornar o repositório público. Não altere a visibilidade sem avaliar o conteúdo do repositório.

## Descoberta, notas e rankings

A pesquisa livre normaliza acentos e usa nome, categoria, bairro, descrição e termos associados. As sugestões respeitam os filtros atuais. O botão de filtros permite categoria, raio em linha reta, nota mínima e integrantes do Top 10. A ordenação separa nome, proximidade e avaliação; não há combinação oculta de critérios. Ao obter uma localização, a descoberta começa com raio de 25 km; fora da região dos registros demonstrativos, pode não haver resultados. Use Sem limite ou Explorar Caraguatatuba para ver os exemplos.

As avaliações começam vazias. O formulário salva ou atualiza **uma avaliação de teste por lugar neste dispositivo**, sem assegurar identidade de usuário. Os comentários são escapados na interface. O modelo separa `source: local-test`, `authorId`, `placeId` e estado de moderação; um backend futuro deverá autenticar autores, aplicar unicidade por usuário/lugar e oferecer denúncia e moderação reais. Notas de produção não entram nos cálculos locais de teste.

O Top 10 de Caraguatatuba considera apenas registros com avaliações locais: média decrescente, quantidade de avaliações como desempate e ID estável no empate final. A ordenação por distância reorganiza os integrantes preservando o número original; filtros por bairro e nota mínima atuam sobre esses integrantes. Enquanto não houver avaliações, não há ranking, e os favoritos vazios mostram seleções editoriais demonstrativas, sem alegar personalização.

## Google Maps: avaliação da migração

O protótipo permanece com Leaflet/OpenStreetMap, sem chave ou faturamento. Foram consultados os documentos oficiais atuais dos SDKs do Google: [Maps JavaScript API Loader — requisitos](https://github.com/googlemaps/js-api-loader#requirements) e [Google Maps Services — segurança de chaves](https://github.com/googlemaps/google-maps-services-js#api-key-security). A consulta direta às páginas em `developers.google.com` retornou HTTP 403 pela política de rede deste ambiente; os documentos oficiais no GitHub foram acessíveis. Não foi possível validar um carregamento real do Google Maps sem configuração disponível.

Para migrar, preparar um projeto Google Cloud, habilitar Maps JavaScript API, configurar faturamento e revisar [uso e cobrança](https://developers.google.com/maps/documentation/javascript/usage-and-billing), obter uma [chave apropriada para navegador](https://developers.google.com/maps/documentation/javascript/get-api-key), restringi-la por API e pelos referenciadores HTTP do site publicado e configurar cotas/alertas. A chave de navegador é visível no cliente: não use nela credenciais de servidor nem uma chave irrestrita. Não incluímos chaves neste repositório.

O SDK permite apresentar os registros do Guia Connect; não importa automaticamente empresas do Google. Places e fotos exigem avaliação específica de APIs, custos, termos e atribuições. Nenhuma foto foi copiada do Google Maps. Um cálculo real de rota exigiria um serviço de rotas; as distâncias atuais são geográficas em linha reta.

## Validação da atualização

Testes automatizados em Chromium cobrem localização autorizada, precisão e recentralização; localização negada e indisponível; referência manual e retorno a Caraguatatuba; busca/sugestões/filtros sincronizados com marcadores; painel sobre o mapa; avaliações locais, atualização e persistência; Top 10 por categoria; favoritos e recomendações; edição empresarial de coordenadas e links; meia tela/expansão no celular; falha do mapa externo. Os testes de regras usam o runner nativo do Node.js. O carregamento real do Google Maps e o backend não foram implementados ou validados. Fotos e tiles reais dependem de acesso externo; falhas foram exercitadas com recursos bloqueados intencionalmente.

## Interface mobile no navegador

Todas as telas usam a mesma área de aplicativo, com largura máxima de 430 px centralizada no computador e largura total no celular, sem moldura de aparelho. `mobile.css` aplica a identidade em azul profundo/ciano e o layout do aplicativo sobre os estilos existentes; `js/icons.js` fornece a família compartilhada de ícones vetoriais locais. O mapa ocupa a área entre o cabeçalho compacto e a navegação inferior, com pesquisa “O que tem perto?” sobreposta. O painel de lugar permanece inferior em qualquer largura, começa em meia tela e pode ser expandido, rolado e fechado sem recriar o mapa. O centro e o zoom são preservados nas alternâncias entre mapa/lista e abas.

A altura usa a janela dinâmica e `VisualViewport`, com áreas seguras, rolagem interna de conteúdo/formulários e ajuste à área disponível quando o teclado reduz a janela. No desktop, a interface continua sendo mobile. Não foram adicionados pagamentos, Plus, cupons ou reservas próprias.

**Referência aplicada:** `Guia_Connect_Apresentacao_Visual_v4.pdf`, enviado pelo usuário. O logo original (bússola à esquerda e nome lateral) foi extraído sem alteração para `assets/guia-connect-logo.jpg`; sua apresentação em uma área branca recorta visualmente apenas as margens do arquivo, preservando proporções e marca. Todas as telas usam esse recurso local. Foram aplicados o cabeçalho azul profundo, destaques ciano, painel arredondado, ações por canal, hero do Top 10 e atalhos funcionais de “Minha empresa” para fotos/posição, cardápio, horários e links. Os mockups orientam composição; não substituem a interface por capturas. Dados, notas e limites anteriores continuam preservados. Roteiros, Plus, cupons e recursos transacionais do PDF seguem como direção futura, sem operação implementada.

Validação desta etapa: Chromium nas larguras 360, 390 e 430 px e em 1440 px (aplicativo de 430 px), sem rolagem horizontal; navegação, pesquisa, filtros, favoritos persistentes, meia tela/expansão/rolagem/fechamento do painel, avaliações, favoritos no ranking, painel empresarial, cardápio, localização e recentralização. O carregamento dos arquivos locais foi verificado com o prefixo `/GUIA-CONNECT/`, equivalente ao GitHub Pages. Teclado foi verificado por simulação da redução da janela, não por teclado nativo de um aparelho físico. Fotos têm ilustração local de fallback; tiles de mapa indisponíveis não são substituídos por imagens ilustrativas.

## Conferência visual das páginas 8–14 e 27

A entrada foi refeita sem foto, banner, seletor de perfil ou rolagem inicial: marca, frase curta e ações Entrar, Criar conta, Explorar sem cadastro e Sou empresa. Os formulários de teste abrem separadamente. A marca no fundo azul usa `assets/guia-connect-on-dark.svg`, que compõe a mesma forma da imagem original com branco e ciano (como nos celulares do PDF); o JPEG original permanece preservado. A revisão visual adotou a hierarquia compacta, barra de busca arredondada, marcadores por categoria, painel inferior, ações por canal e navegação inferior das referências.

As capturas reais do aplicativo estão em `docs/captures/entrada.png`, `mapa.png` e `painel.png`. Foram inspecionadas e comparadas com os celulares do PDF. O mapa fotografado mostra seu estado de falha, identificado na interface: o acesso deste ambiente aos tiles do OpenStreetMap está indisponível/rejeitado. Não é uma reprodução do fundo cartográfico dos mockups, não substituímos o mapa por uma imagem e não migramos de provedor. No site, o fundo depende da disponibilidade e das regras do OpenStreetMap.

A entrada foi testada sem rolagem em 360×640, 390×844, 430×932 e desktop 1440×900 (área de aplicativo de 430 px). Foram preservados e retestados acesso cliente/empresa, busca, favoritos, avaliações, ranking e edição empresarial. Teclado nativo de aparelho físico e deploy remoto não foram verificados neste ambiente.

As fotos ilustrativas existentes foram espelhadas em `assets/places/`, preservando os URLs de origem em `imageSource` nos dados. Não são fotos dos estabelecimentos fictícios nem imagens extraídas das telas do PDF. O formulário empresarial mantém a foto quando o campo URL fica vazio e oferece uma ação explícita para substituí-la pela ilustração local.

Nas capturas, a posição de Caraguatatuba foi fornecida pela simulação de geolocalização do navegador de testes; não é a localização do usuário. O fundo cartográfico está indisponível e identificado. As fotos locais são carregadas de seus próprios arquivos, sem usar capturas do PDF como telas.
