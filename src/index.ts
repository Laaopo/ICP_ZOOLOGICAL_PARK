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

// Define the Zoo record structure
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

// Define the Animal record structure
type Animal = Record<{
  id: string;
  age: number;
  animalType: string;
  name: string;
  zooId: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the payload for creating a new Zoo
type ZooPayload = Record<{
  name: string;
  location: string;
  image: string;
}>;

// Define the payload for creating a new Animal
type AnimalPayload = Record<{
  age: number;
  animalType: string;
  name: string;
  zooId: string;
}>;

const zooStorage = new StableBTreeMap<string, Zoo>(0, 44, 1024);
const animalStorage = new StableBTreeMap<string, Animal>(1, 44, 1024);

$update;

// Function to create a new Zoo
export function createZoo(payload: ZooPayload): Result<Zoo, string> {
  if (!payload.name || !payload.location || !payload.image) {
    // Validation: Check if required fields in the payload are missing
    return Result.Err<Zoo, string>("Missing required fields in payload");
  }

  // Create a new Zoo object
  const zoo: Zoo = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    animalSpecies: [],
    owner: ic.caller(),
    name: payload.name,
    location: payload.location,
    image: payload.image,

  };

  try {
    // Insert the new Zoo record into storage
    zooStorage.insert(zoo.id, zoo);
  } catch (error) {
    return Result.Err<Zoo, string>("Error occurred during zoo insertion");
  }

  return Result.Ok<Zoo, string>(zoo);
}

$query;

// Function to retrieve a Zoo by its ID
export function getZooById(id: string): Result<Zoo, string> {
  if (!id) {
    // Validation: Check if ID is invalid or missing
    return Result.Err<Zoo, string>(`Invalid id=${id}.`);
  }
  try {
    return match(zooStorage.get(id), {
      Some: (zoo) => Result.Ok<Zoo, string>(zoo),
      None: () => Result.Err<Zoo, string>(`Zoo with id=${id} not found.`),
    });

  } catch (error) {
    return Result.Err<Zoo, string>(`Error while retrieving zoo with id ${id}`);
  }
}

$query;

// Function to retrieve all Zoos
export function getAllZoos(): Result<Vec<Zoo>, string> {
  try {
    return Result.Ok(zooStorage.values());
  } catch (error) {
    return Result.Err(`Failed to get all zoos: ${error}`);
  }
}

$update;

// Function to update a Zoo record
export function updateZoo(id: string, payload: ZooPayload): Result<Zoo, string> {
  if (!id) {
    // Validation: Check if ID is invalid or missing
    return Result.Err<Zoo, string>('Invalid id.');
  }

  if (!payload.name || !payload.location || !payload.image) {
    // Validation: Check if required fields in the payload are missing
    return Result.Err<Zoo, string>('Missing required fields in payload.');
  }

  return match(zooStorage.get(id), {
    Some: (existingZoo) => {
      // Create an updated Zoo object
      const updatedZoo: Zoo = {
        id: existingZoo.id,
        name: payload.name,
        location: payload.location,
        image: payload.image,
        owner: existingZoo.owner,
        animalSpecies: existingZoo.animalSpecies,
        createdAt: existingZoo.createdAt,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        // Update the Zoo record in storage
        zooStorage.insert(updatedZoo.id, updatedZoo);
        return Result.Ok<Zoo, string>(updatedZoo);
      } catch (error) {
        return Result.Err<Zoo, string>(`Error updating zoo: ${error}`);
      }
    },

    None: () => Result.Err<Zoo, string>(`Zoo with id=${id} not found.`),
  });
}

$update;

// Function to delete a Zoo by its ID
export function deleteZoo(id: string): Result<Zoo, string> {
  if (!id) {
    // Validation: Check if ID is invalid or missing
    return Result.Err<Zoo, string>(`Invalid id=${id}.`);
  }
  try {
    return match(zooStorage.get(id), {
      Some: (existingZoo) => {
        // Check if the caller is the owner of the Zoo
        if (existingZoo.owner.toString() !== ic.caller.toString()) {
          return Result.Err<Zoo, string>("User does not have the right to delete zoo");
        }

        // Remove the Zoo from storage
        zooStorage.remove(id);
        return Result.Ok<Zoo, string>(existingZoo);
      },
      None: () => Result.Err<Zoo, string>(`Zoo with id=${id} not found.`),
    });
  } catch (error) {
    return Result.Err<Zoo, string>(`Error deleting zoo with id=${id}: ${error}`);
  }
}

$update;

// Function to create a new Animal
export function createAnimal(payload: AnimalPayload): Result<Animal, string> {
  if (!payload.age || !payload.animalType || !payload.name || !payload.zooId) {
    // Validation: Check if required fields in the payload are missing
    return Result.Err<Animal, string>("Missing required fields in payload");
  }

  if (payload.age <= 0) {
    // Validation: Check if age is greater than zero
    return Result.Err<Animal, string>("Age must be greater than zero.");
  }

  // Create a new Animal object
  const animal: Animal = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };

  try {
    // Insert the new Animal record into storage
    animalStorage.insert(animal.id, animal);
  } catch (error) {
    return Result.Err<Animal, string>("Error occurred during animal insertion");
  }

  return Result.Ok<Animal, string>(animal);
}

$query;

// Function to retrieve an Animal by its ID
export function getAnimalById(id: string): Result<Animal, string> {
  if (!id) {
    // Validation: Check if ID is invalid or missing
    return Result.Err<Animal, string>(`Invalid id=${id}.`);
  }
  try {
    return match(animalStorage.get(id), {
      Some: (animal) => Result.Ok<Animal, string>(animal),
      None: () => Result.Err<Animal, string>(`Animal with id=${id} not found.`),
    });

  } catch (error) {
    return Result.Err<Animal, string>(`Error while retrieving animal with id ${id}`);
  }
}

$query;

// Function to retrieve all Animals
export function getAllAnimals(): Result<Vec<Animal>, string> {
  try {
    return Result.Ok(animalStorage.values());
  } catch (error) {
    return Result.Err(`Failed to get all animals: ${error}`);
  }
}

$update;

// Function to add an Animal to a Zoo
export function addAnimalToZoo(animalId: string, zooId: string): Result<Zoo, string> {
  const animalResult = animalStorage.get(animalId);
  const zooResult = zooStorage.get(zooId);

  return match(animalResult, {
    Some: (animal) => {
      return match(zooResult, {
        Some: (zoo) => {
          if (!zoo.animalSpecies.includes(animalId)) {
            zoo.animalSpecies.push(animalId);
            try {
              // Update the Zoo record in storage
              zooStorage.insert(zooId, zoo);
              return Result.Ok<Zoo, string>(zoo);
            } catch (error) {
              return Result.Err<Zoo, string>(`Error updating zoo: ${error}`);
            }
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

// Function to remove an Animal from a Zoo
export function deleteAnimalFromZoo(animalId: string, zooId: string): Result<Zoo, string> {
  const zooResult = zooStorage.get(zooId);

  return match(zooResult, {
    Some: (zoo) => {
      if (zoo.animalSpecies.includes(animalId)) {
        zoo.animalSpecies = zoo.animalSpecies.filter((id) => id !== animalId);
        try {
          // Update the Zoo record in storage
          zooStorage.insert(zooId, zoo);
          return Result.Ok<Zoo, string>(zoo);
        } catch (error) {
          return Result.Err<Zoo, string>(`Error updating zoo: ${error}`);
        }
      }
      return Result.Err<Zoo, string>(`Animal with ID=${animalId} is not in the zoo.`);
    },
    None: () => Result.Err<Zoo, string>(`Zoo with ID=${zooId} not found.`),
  });
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

