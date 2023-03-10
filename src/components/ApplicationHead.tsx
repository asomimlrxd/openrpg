import Head from 'next/head';

type ApplicationHeadProps = {
	title?: string;
	children?: React.ReactChild;
};

export default function ApplicationHead({ title, children }: ApplicationHeadProps) {
	return (
		<Head>
			<meta
				name='description'
				content='Website dedicado à criação da Ficha do RPG da Sunflower Studios!'
			/>
			<meta name='author' content='Sunflower Studios' />
			<title>{`${title || ''} - Sunflower RPG`}</title>
			{children}
		</Head>
	);
}
