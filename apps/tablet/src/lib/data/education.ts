import type { Lesson, Quiz } from '@atbots/protocol';

export const SAMPLE_QUIZZES: Quiz[] = [
	{
		id: 'quiz-space',
		title: 'Solar System Exploration',
		description: 'Test your knowledge about planets, moons, and the sun.',
		category: 'Science',
		questions: [
			{
				id: 'q1',
				question: 'Which planet is known as the Red Planet?',
				options: [
					{ id: 'a', text: 'Venus' },
					{ id: 'b', text: 'Mars' },
					{ id: 'c', text: 'Jupiter' },
					{ id: 'd', text: 'Mercury' }
				],
				correctOptionId: 'b',
				explanation: 'Mars appears red due to iron oxide (rust) on its surface.'
			},
			{
				id: 'q2',
				question: 'What is the largest planet in our solar system?',
				options: [
					{ id: 'a', text: 'Saturn' },
					{ id: 'b', text: 'Neptune' },
					{ id: 'c', text: 'Jupiter' },
					{ id: 'd', text: 'Earth' }
				],
				correctOptionId: 'c',
				explanation: 'Jupiter is more than twice as massive as all other planets combined.'
			},
			{
				id: 'q3',
				question: 'How long does it take sunlight to reach Earth?',
				options: [
					{ id: 'a', text: 'About 8 seconds' },
					{ id: 'b', text: 'About 8 minutes' },
					{ id: 'c', text: 'About 8 hours' },
					{ id: 'd', text: 'Instantaneous' }
				],
				correctOptionId: 'b',
				explanation:
					'Light travels from the Sun to Earth in approximately 8 minutes and 20 seconds.'
			}
		]
	},
	{
		id: 'quiz-robotics',
		title: 'Robotics & AI Basics',
		description: 'Learn how sensors, actuators, and code bring robots to life.',
		category: 'Technology',
		questions: [
			{
				id: 'r1',
				question:
					'What is the component that converts electrical energy into mechanical movement called?',
				options: [
					{ id: 'a', text: 'Sensor' },
					{ id: 'b', text: 'Actuator / Motor' },
					{ id: 'c', text: 'Battery' },
					{ id: 'd', text: 'Microcontroller' }
				],
				correctOptionId: 'b',
				explanation: 'Actuators and motors convert electrical signals into physical motion.'
			},
			{
				id: 'r2',
				question: 'What type of sensor measures distance using reflected sound waves?',
				options: [
					{ id: 'a', text: 'Ultrasonic sensor' },
					{ id: 'b', text: 'Lidar' },
					{ id: 'c', text: 'Thermometer' },
					{ id: 'd', text: 'Gyroscope' }
				],
				correctOptionId: 'a',
				explanation:
					'Ultrasonic sensors emit high-frequency sound pulses and measure the echo time to calculate distance.'
			},
			{
				id: 'r3',
				question: 'Why do robots like AT Bots use a deadman failsafe?',
				options: [
					{ id: 'a', text: 'To save battery power when idle' },
					{ id: 'b', text: 'To automatically stop motion if connection is lost' },
					{ id: 'c', text: 'To speed up motor rotation' },
					{ id: 'd', text: 'To recharge internal capacitors' }
				],
				correctOptionId: 'b',
				explanation:
					'A deadman timer stops drive immediately if control heartbeats stop arriving, preventing runaway hazards.'
			}
		]
	}
];

export const SAMPLE_LESSONS: Lesson[] = [
	{
		id: 'lesson-how-robots-think',
		title: 'How Service Robots Work',
		summary:
			'An introduction to sensing, computing, speech synthesis, and local robot control planes.',
		category: 'Robotics',
		readingTimeMinutes: 3,
		sections: [
			{
				heading: '1. The Anatomy of a Receptionist Robot',
				content:
					'Service robots combine three key layers: a physical chassis with motors and expressive joints, an interactive tablet interface for visitors, and a fast local control plane that handles safety and commands without relying on internet access.',
				speechScript:
					'Service robots combine physical motors, an interactive screen, and a local control plane that keeps motion safe and responsive.'
			},
			{
				heading: '2. Why Realtime Voice Needs Half-Duplex Audio',
				content:
					'When a robot speaks through high-power internal speakers, sound easily leaks into its own microphone. In half-duplex mode, the robot mutes its listening channel during speech playback, eliminating acoustic feedback loops completely.',
				speechScript:
					'By muting the microphone while speaking, robots prevent audio echo and avoid talking over their own voice.'
			},
			{
				heading: '3. Keeping Motion Safe and Offline-Capable',
				content:
					'Instead of letting remote AI models generate raw joint angles, the robot motion controller stores pre-validated motion sequences in local flash memory. The AI chooses what sequence to run, but local firmware validates all joint limits and deadman timers.',
				speechScript:
					'Choreographed movements are stored locally on the robot, ensuring all motions stay within safe physical limits.'
			}
		]
	},
	{
		id: 'lesson-clean-energy',
		title: 'LiFePO4 Batteries & Clean Power',
		summary: 'Why lithium iron phosphate chemistry is the gold standard for safe indoor robotics.',
		category: 'Energy',
		readingTimeMinutes: 2,
		sections: [
			{
				heading: '1. What Makes LiFePO4 Chemistry Different?',
				content:
					'Lithium Iron Phosphate (LiFePO4) offers superior thermal and chemical stability compared to traditional lithium-ion chemistries. It resists overheating, has a high cycle life exceeding 2,000 cycles, and does not produce runaway thermal reactions if punctured.',
				speechScript:
					'Lithium iron phosphate batteries are significantly safer for indoor robots because they resist overheating and last for thousands of charge cycles.'
			},
			{
				heading: '2. Battery Management & Voltage Safety',
				content:
					'A Battery Management System (BMS) continuously balances cells and protects against overcharging, deep discharge, and short circuits. It ensures safe charging at 14.6 volts while regulating continuous power to motors and logic boards.',
				speechScript:
					'The Battery Management System monitors each cell to protect against overcharging and short circuits.'
			}
		]
	}
];
