// Dados iniciais do cardápio do restaurante com imagens leves e otimizadas em WebP
const CATEGORY_DEFAULT_IMAGES = {
  entradas: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=360&q=80",
  pratos: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=360&q=80",
  porcoes: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=360&q=80",
  bebidas: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=360&q=80",
  sobremesas: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=360&q=80"
};

const DEFAULT_MENU = [
  // Entradas
  {
    id: "ent-1",
    name: "Bruschetta Pomodoro",
    category: "entradas",
    price: 24.90,
    description: "Fatias de pão italiano tostadas, tomate concassé, alho, manjericão fresco e azeite extravirgem.",
    image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "ent-2",
    name: "Coxinha de Costela (4 unid.)",
    category: "entradas",
    price: 28.00,
    description: "Coxinhas crocantes recheadas com costela bovina desfiada e catupiry original.",
    image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "ent-3",
    name: "Dadinhos de Tapioca",
    category: "entradas",
    price: 26.50,
    description: "Dadinhos dourados de tapioca com queijo coalho, acompanhados de geleia de pimenta defumada.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=360&q=80"
  },

  // Pratos Principais
  {
    id: "prato-1",
    name: "Filé Mignon ao Molho Madeira",
    category: "pratos",
    price: 68.90,
    description: "Medalhão de filé mignon grelhado com molho de vinho madeira e cogumelos, acompanhado de arroz de brócolis e fritas rústicas.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "prato-2",
    name: "Risoto de Funghi Secchi",
    category: "pratos",
    price: 54.00,
    description: "Arroz arbóreo cozido lentamente com caldo artesanal, funghi secchi, parmesão e finalizado com manteiga de trufas.",
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "prato-3",
    name: "Salmão Grelhado com Legumes",
    category: "pratos",
    price: 62.00,
    description: "Posta de salmão grelhada na crosta de gergelim, servido com legumes salteados na manteiga e purê de mandioquinha.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "prato-4",
    name: "Nhoque ao Pesto e Stracciatella",
    category: "pratos",
    price: 48.00,
    description: "Nhoque de batata artesanal ao molho pesto de manjericão fresco, finalizado com queijo stracciatella cremoso e nozes tostadas.",
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=360&q=80"
  },

  // Porções
  {
    id: "por-1",
    name: "Batata Frita Rústica com Cheddar",
    category: "porcoes",
    price: 32.00,
    description: "Batatas fritas com casca, salpicadas com páprica, cobertas com molho cheddar cremoso e bacon crocante.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "por-2",
    name: "Iscas de Tilápia Crocantes",
    category: "porcoes",
    price: 45.00,
    description: "Tiras de filé de tilápia empanadas na farinha panko, servidas com maionese artesanal de limão siciliano.",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=360&q=80"
  },

  // Bebidas
  {
    id: "beb-1",
    name: "Suco Natural de Laranja",
    category: "bebidas",
    price: 10.00,
    description: "Suco de laranja natural e espremido na hora, copo de 400ml.",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "beb-2",
    name: "Refrigerante Lata",
    category: "bebidas",
    price: 6.50,
    description: "Coca-Cola, Coca-Cola Sem Açúcar, Guaraná Antarctica ou Sprite (350ml).",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "beb-3",
    name: "Chope Artesanal IPA",
    category: "bebidas",
    price: 15.00,
    description: "Chope artesanal estilo IPA, encorpado e aromático (copo de 450ml).",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "beb-4",
    name: "Caipirinha de Limão",
    category: "bebidas",
    price: 18.90,
    description: "Caipirinha tradicional com cachaça premium, limão taiti, açúcar e gelo.",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=360&q=80"
  },

  // Sobremesas
  {
    id: "sob-1",
    name: "Pudim de Leite Condensado",
    category: "sobremesas",
    price: 14.00,
    description: "Pudim super cremoso sem furinhos, servido com calda de caramelo brilhante.",
    image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "sob-2",
    name: "Petit Gâteau de Chocolate",
    category: "sobremesas",
    price: 22.00,
    description: "Bolo quente de chocolate com recheio cremoso escorrendo, servido com sorvete de creme e calda de chocolate.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=360&q=80"
  },
  {
    id: "sob-3",
    name: "Cheesecake de Frutas Vermelhas",
    category: "sobremesas",
    price: 19.50,
    description: "Base crocante de biscoito, creme suave de queijo e cobertura de geleia artesanal de morango, amora e mirtilo.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=360&q=80"
  }
];
