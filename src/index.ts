import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type Zoo = Record<{
  id: string;
  name: string;
  location: string;
  owner: Principal;
  animalSpecies: Vec<string>;
  image: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type Animal = Record<{
  id: string;
  age: number;
  animalType: string;
  name: string;
  zooId: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type ZooPayload = Record<{
  name: string;
  location: string;
  image: string;
}>;

type AnimalPayload = Record<{
  age: number;
  animalType: string;
  name: string;
  zooId: string;
}>;

const zooStorage = new StableBTreeMap<string, Zoo>(0, 44, 1024);

const animalStorage = new StableBTreeMap<string, Animal>(1, 44, 1024);

$update;

export function createZoo(payload: ZooPayload): Result<Zoo, string> {
  const zoo: Zoo = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    animalSpecies: [],
    owner: ic.caller(),
    ...payload,
  };

  zooStorage.insert(zoo.id, zoo);
  return Result.Ok<Zoo, string>(zoo);
}

$query;
export function getZoo(id: string): Result<Zoo, string> {
  return match(zooStorage.get(id), {
    Some: (zoo) => Result.Ok<Zoo, string>(zoo),
    None: () => Result.Err<Zoo, string>(`Zoo with ID=${id} not found.`),
  });
}

$query;
export function getAllZoos(): Result<Vec<Zoo>, string> {
  return Result.Ok(zooStorage.values());
}

$update;
export function updateZoo(id: string, payload: ZooPayload): Result<Zoo, string> {
  return match(zooStorage.get(id), {
    Some: (existingZoo) => {
      const updatedZoo: Zoo = {
        ...existingZoo,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      zooStorage.insert(updatedZoo.id, updatedZoo);
      return Result.Ok<Zoo, string>(updatedZoo);
    },
    None: () => Result.Err<Zoo, string>(`Zoo with ID=${id} not found.`),
  });
}

$update;
export function deleteZoo(id: string): Result<Zoo, string> {
  return match(zooStorage.get(id), {
    Some: (existingZoo) => {
      zooStorage.remove(id);
      return Result.Ok<Zoo, string>(existingZoo);
    },
    None: () => Result.Err<Zoo, string>(`Zoo with ID=${id} not found.`),
  });
}

$update;
export function createAnimal(payload: AnimalPayload): Result<Animal, string> {
  const animal: Animal = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };

  animalStorage.insert(animal.id, animal);
  return Result.Ok<Animal, string>(animal);
}

$query;
export function getAnimal(id: string): Result<Animal, string> {
  return match(animalStorage.get(id), {
    Some: (animal) => Result.Ok<Animal, string>(animal),
    None: () => Result.Err<Animal, string>(`Animal with ID=${id} not found.`),
  });
}

$query;
export function getAllAnimals(): Result<Vec<Animal>, string> {
  return Result.Ok(animalStorage.values());
}

$update;
export function addAnimalToZoo(animalId: string, zooId: string): Result<Zoo, string> {
  const animalResult = animalStorage.get(animalId);
  const zooResult = zooStorage.get(zooId);

  return match(animalResult, {
    Some: (animal) => {
      return match(zooResult, {
        Some: (zoo) => {
          if (!zoo.animalSpecies.includes(animalId)) {
            zoo.animalSpecies.push(animalId);
            zooStorage.insert(zooId, zoo);
            return Result.Ok<Zoo, string>(zoo);
          }
          return Result.Err<Zoo, string>(`Animal with ID=${animalId} is already in the zoo.`);
        },
        None: () => Result.Err<Zoo, string>(`Zoo with ID=${zooId} not found.`),
      });
    },
    None: () => Result.Err<Zoo, string>(`Animal with ID=${animalId} not found.`),
  });
}

$update;
export function deleteAnimalFromZoo(animalId: string, zooId: string): Result<Zoo, string> {
  const zooResult = zooStorage.get(zooId);

  return match(zooResult, {
    Some: (zoo) => {
      if (zoo.animalSpecies.includes(animalId)) {
        zoo.animalSpecies = zoo.animalSpecies.filter((id) => id !== animalId);
        zooStorage.insert(zooId, zoo);
        return Result.Ok<Zoo, string>(zoo);
      }
      return Result.Err<Zoo, string>(`Animal with ID=${animalId} is not in the zoo.`);
    },
    None: () => Result.Err<Zoo, string>(`Zoo with ID=${zooId} not found.`),
  });
}

$update;

// New Function 1: Get all animals in a specific zoo
$query;
export function getAnimalsInZoo(zooId: string): Result<Vec<Animal>, string> {
  const zooResult = zooStorage.get(zooId);

  return match(zooResult, {
    Some: (zoo) => {
      const animalIds = zoo.animalSpecies;
      const animals = animalIds.map((animalId) => {
        const animalResult = animalStorage.get(animalId);
        return match(animalResult, {
          Some: (animal) => animal,
          None: null, // Handle missing animals
        });
      });
      return Result.Ok(animals.filter((animal) => animal !== null));
    },
    None: () => Result.Err<Animal, string>(`Zoo with ID=${zooId} not found.`),
  });
}

// New Function 2: Get the owner of a specific zoo
$query;
export function getZooOwner(zooId: string): Result<Principal, string> {
  const zooResult = zooStorage.get(zooId);

  return match(zooResult, {
    Some: (zoo) => Result.Ok(zoo.owner),
    None: () => Result.Err<Principal, string>(`Zoo with ID=${zooId} not found.`),
  });
}

// New Function 3: Update an animal's information
$update;
export function updateAnimal(id: string, payload: AnimalPayload): Result<Animal, string> {
  return match(animalStorage.get(id), {
    Some: (existingAnimal) => {
      const updatedAnimal: Animal = {
        ...existingAnimal,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      animalStorage.insert(updatedAnimal.id, updatedAnimal);
      return Result.Ok<Animal, string>(updatedAnimal);
    },
    None: () => Result.Err<Animal, string>(`Animal with ID=${id} not found.`),
  });
}

// New Function 4: Delete an animal
$update;
export function deleteAnimal(id: string): Result<Animal, string> {
  return match(animalStorage.get(id), {
    Some: (existingAnimal) => {
      animalStorage.remove(id);
      return Result.Ok<Animal, string>(existingAnimal);
    },
    None: () => Result.Err<Animal, string>(`Animal with ID=${id} not found.`),
  });
}

// New Function 5: Get the number of animals in a zoo
$query;
export function getAnimalCountInZoo(zooId: string): Result<number, string> {
  const zooResult = zooStorage.get(zooId);

  return match(zooResult, {
    Some: (zoo) => Result.Ok(zoo.animalSpecies.length),
    None: () => Result.Err<number, string>(`Zoo with ID=${zooId} not found.`),
  });
}

// New Function 6: Get the age of a specific animal
$query;
export function getAnimalAge(id: string): Result<number, string> {
  const animalResult = animalStorage.get(id);

  return match(animalResult, {
    Some: (animal) => Result.Ok(animal.age),
    None: () => Result.Err<number, string>(`Animal with ID=${id} not found.`),
  });
}

// New Function 7: Get the number of zoos in the system
$query;
export function getZooCount(): Result<number, string> {
  return Result.Ok(zooStorage.size());
}

// New Function 8: Get the number of animals in the system
$query;
export function getAnimalCount(): Result<number, string> {
  return Result.Ok(animalStorage.size());
}

// Set up a random number generator for generating UUIDs
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
