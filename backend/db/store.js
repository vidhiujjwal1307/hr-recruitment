// In-memory fallback data store when MongoDB is disconnected or offline

const candidates = [
  {
    _id: 'cand_demo_1',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Express', 'CSS'],
    experience: [
      { title: 'Full Stack Engineer', company: 'Tech Corp', duration: '3 years', description: 'Built React apps & Node APIs.' }
    ],
    education: [
      { degree: 'B.S. Computer Science', institution: 'State University', year: '2021' }
    ],
    rawText: 'Alex Rivera, Full Stack Engineer with 3+ years experience in React and Node.js.',
    createdAt: new Date()
  }
];

const jobs = [
  {
    _id: 'job_demo_1',
    title: 'Senior Full Stack Engineer',
    description: 'Looking for an experienced Full Stack Engineer proficient in React, Node.js, and Cloud services.',
    requirements: ['React', 'Node.js', 'MongoDB', 'REST APIs', 'TypeScript'],
    location: 'Remote',
    createdAt: new Date()
  },
  {
    _id: 'job_demo_2',
    title: 'AI / ML Engineer',
    description: 'Build cutting edge LLM agent workflows, vector embeddings, and resume processing pipelines.',
    requirements: ['Python', 'LLMs', 'ChromaDB', 'Node.js', 'FastAPI'],
    location: 'Hybrid / San Francisco',
    createdAt: new Date()
  }
];

module.exports = { candidates, jobs };
