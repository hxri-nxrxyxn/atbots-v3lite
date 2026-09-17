export interface QuizOption {
	id: string;
	text: string;
}

export interface QuizQuestion {
	id: string;
	question: string;
	options: QuizOption[];
	correctOptionId: string;
	explanation: string;
}

export interface Quiz {
	id: string;
	title: string;
	description: string;
	category: string;
	iconName?: string;
	questions: QuizQuestion[];
}

export interface LessonSection {
	heading: string;
	content: string;
	speechScript?: string;
}

export interface Lesson {
	id: string;
	title: string;
	summary: string;
	category: string;
	readingTimeMinutes: number;
	sections: LessonSection[];
}
