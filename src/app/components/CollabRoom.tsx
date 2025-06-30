"use client";

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";


const randomName = uniqueNamesGenerator({
  dictionaries: [adjectives, colors, animals],
  separator: "-",
  length: 3,
});

export default function CollabRoom() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-center">Collab Room</h1>
      <div className="w-full h-[calc(80vh)] items-center justify-center bg-gray-200"></div>
      <p className="text-center">
        {randomName}
      </p>
    </div>
  );
}