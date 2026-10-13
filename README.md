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
- Filtros por bairro, ordenação alfabética e por distância em linha reta após autorizar geolocalização. A permissão só é solicitada ao tocar em Minha localização.
- Páginas de lugares, cardápio com preços fictícios e informações específicas por categoria.
- Favoritos e preferências persistidos no dispositivo, Top 10 demonstrativo e perfil com confirmação para apagar dados locais.
- Painel empresarial: escolha Sou empresa e entre com nome/e-mail fictícios. Edite o primeiro estabelecimento, pré-visualize e salve no navegador. Nenhuma alteração é publicada.
- Links externos específicos com validação de HTTPS e domínio da plataforma. Links ausentes são identificados; mapas apontam apenas para coordenadas ilustrativas. A validação de URL não comprova propriedade, disponibilidade ou autenticidade do destino.

Todos os estabelecimentos, coordenadas, horários, programação e preços são ilustrativos. Não existem pagamentos, reservas próprias, avaliações reais ou autenticação segura. Não insira dados pessoais. As imagens são ilustrativas, fornecidas pelo Unsplash.

## Organização

- `index.html`: estrutura e carregamento.
- `styles.css`: identidade visual e adaptação para celular/computador.
- `js/data.js`: categorias e dados substituíveis.
- `js/app.js`: rotas, interface, mapa e estado local.

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
