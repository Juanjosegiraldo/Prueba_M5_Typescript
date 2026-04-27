import { PrismaClient } from '.prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getMimeTypeFromExtension, validateImageUpload } from '@/lib/image-upload';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration for seed uploads');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const STORAGE_BUCKET = 'casas';
const SEED_ASSETS_DIR = path.join(process.cwd(), 'prisma', 'seed-assets');

type SeedCasaInput = {
  titulo: string;
  descripcion: string;
  precio: number;
  owner: 'admin' | 'agent';
  imageFile: string;
};

const seedCasas: SeedCasaInput[] = [
  {
    titulo: 'Casa Moderna en El Poblado',
    descripcion: 'Hermosa casa de 3 pisos con acabados de lujo, cocina integral, garaje para 2 carros y jardin privado en el corazon de El Poblado.',
    precio: 850000000,
    owner: 'agent',
    imageFile: 'casa-moderna-poblado.jpg',
  },
  {
    titulo: 'Apartamento Laureles Vista Al Parque',
    descripcion: 'Amplio apartamento de 120m² con 3 habitaciones, 2 banos, balcon con vista al parque, conjunto cerrado con piscina y salon comunal.',
    precio: 420000000,
    owner: 'agent',
    imageFile: 'apartamento-laureles.jpg',
  },
  {
    titulo: 'Casa Campestre Envigado',
    descripcion: 'Espectacular casa campestre con 5000m² de terreno, piscina, zona BBQ, 4 habitaciones, 3 banos y hermosa vista a la montana.',
    precio: 1200000000,
    owner: 'admin',
    imageFile: 'casa-campestre-envigado.jpg',
  },
];

const getPublicImageUrl = async (fileName: string) => {
  const filePath = path.join(SEED_ASSETS_DIR, fileName);
  const fileStats = await stat(filePath);
  const mimeType = getMimeTypeFromExtension(fileName);

  if (!mimeType) {
    throw new Error(`Could not infer MIME type for seed asset ${fileName}`);
  }

  const validation = validateImageUpload({
    name: fileName,
    size: fileStats.size,
    type: mimeType,
  });

  if (!validation.valid) {
    throw new Error(`Invalid seed asset ${fileName}: ${validation.error}`);
  }

  const fileBuffer = await readFile(filePath);
  const storagePath = `seed/${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed for ${fileName}: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
};

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const agentPassword = await bcrypt.hash('agent123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@casahub.com' },
    update: {},
    create: {
      name: 'Admin Principal',
      email: 'admin@casahub.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agente@casahub.com' },
    update: {},
    create: {
      name: 'Agente Demo',
      email: 'agente@casahub.com',
      password: agentPassword,
      role: 'AGENT',
    },
  });

  const owners = {
    admin,
    agent,
  } as const;

  let createdCount = 0;
  let skippedCount = 0;

  for (const casa of seedCasas) {
    const owner = owners[casa.owner];
    const existingCasa = await prisma.casa.findFirst({
      where: {
        titulo: casa.titulo,
        userId: owner.id,
      },
      select: { id: true },
    });

    if (existingCasa) {
      skippedCount += 1;
      console.log(`↷ Casa omitida: "${casa.titulo}" ya existe para ${owner.email}`);
      continue;
    }

    const imagenUrl = await getPublicImageUrl(casa.imageFile);

    await prisma.casa.create({
      data: {
        titulo: casa.titulo,
        descripcion: casa.descripcion,
        precio: casa.precio,
        imagenUrl,
        userId: owner.id,
      },
    });

    createdCount += 1;
    console.log(`✓ Casa creada: "${casa.titulo}" -> ${imagenUrl}`);
  }

  console.log('Seed completado', {
    admin: admin.email,
    agent: agent.email,
    createdCount,
    skippedCount,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
