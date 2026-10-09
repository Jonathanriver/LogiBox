// Simulación de base de datos en memoria
let items = [
  { id: 1, title: 'Configurar Node.js & Express', completed: true, category: 'Backend' },
  { id: 2, title: 'Estructurar Frontend en Angular', completed: true, category: 'Frontend' },
  { id: 3, title: 'Preparar configuración de Hosting', completed: true, category: 'DevOps' },
  { id: 4, title: 'Desplegar en producción', completed: false, category: 'Hosting' }
];

export const getItems = (req, res) => {
  res.json({
    success: true,
    data: items,
    count: items.length
  });
};

export const getItemById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
  }
  res.json({ success: true, data: item });
};

export const createItem = (req, res) => {
  const { title, category } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'El título es obligatorio' });
  }

  const newItem = {
    id: items.length ? Math.max(...items.map(i => i.id)) + 1 : 1,
    title,
    category: category || 'General',
    completed: false
  };

  items.push(newItem);
  res.status(201).json({ success: true, data: newItem });
};

export const toggleItem = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
  }
  item.completed = !item.completed;
  res.json({ success: true, data: item });
};

export const deleteItem = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const initialLength = items.length;
  items = items.filter(i => i.id !== id);
  if (items.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
  }
  res.json({ success: true, message: 'Elemento eliminado correctamente' });
};
