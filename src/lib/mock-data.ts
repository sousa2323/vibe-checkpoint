export interface MockEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  price?: string;
  going?: number;
  image: string;
  live?: boolean;
  category: string;
}

export const mockEvents: MockEvent[] = [
  {
    id: "1",
    title: "Lunch Party",
    venue: "ICCB, Dhaka, Bangladesh",
    date: "16 Dec",
    price: "$1200",
    going: 8,
    image:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&auto=format&fit=crop&q=70",
    category: "Festa",
    live: true,
  },
  {
    id: "2",
    title: "Roda de Samba",
    venue: "Bar do Mineiro, Santa Teresa",
    date: "22 Dec",
    price: "R$ 30",
    going: 24,
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=70",
    category: "Música ao vivo",
  },
  {
    id: "3",
    title: "Stand-up Night",
    venue: "Comedians Pub, Vila Madalena",
    date: "29 Dec",
    price: "R$ 50",
    going: 12,
    image:
      "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=1200&auto=format&fit=crop&q=70",
    category: "Comédia",
  },
];

export const mockSpills = [
  {
    id: "s1",
    title: "Intra Fee Football Tournament",
    dueDate: "28/02/2026",
    amount: "$ 2,000",
  },
  {
    id: "s2",
    title: "Jantar de Aniversário",
    dueDate: "10/03/2026",
    amount: "R$ 480",
  },
];
