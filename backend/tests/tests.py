import unittest
from unittest.mock import patch, MagicMock
from news_query import data_to_news, cluster
from news import News
import random

class TestNewsQuery(unittest.TestCase):
    def test_data_to_news(self):
        sample_data = {
            "feed": [
                {
                    "time_published": "20240101T120000",
                    "content": "Full article content",
                    "title": "Test Title",
                    "url": "http://example.com"
                }
            ]
        }
        news_list = data_to_news(sample_data)
        self.assertEqual(len(news_list), 1)
        self.assertIsInstance(news_list[0], News)
        self.assertEqual(news_list[0].news_id, 0)
        self.assertEqual(news_list[0].content, "Full article content")
        self.assertEqual(news_list[0].title, "Test Title")
        self.assertEqual(news_list[0].link, "http://example.com")

    #Note: For the following tests to pass, you are explicitly required to limit the max clusters into ideal amount of clusters
    def test_cluster_with_real_model(self):
        # 10 basketball sentences (same topic)
        basketball = [
            "The Lakers won their game last night with a buzzer beater.",
            "LeBron James scored 30 points in the Lakers' victory.",
            "The NBA playoffs are heating up as the Lakers advance.",
            "Anthony Davis dominated the paint for the Lakers.",
            "The Lakers' defense was key to their win.",
            "Fans celebrated the Lakers' win downtown.",
            "The Lakers' coach praised the team's effort.",
            "A record crowd watched the Lakers play.",
            "The Lakers are favorites to win the championship.",
            "The Lakers' teamwork led to a decisive victory."
        ]
        # 10 religion sentences (same event)
        religion = [
            "The Pope led a mass attended by thousands.",
            "Pilgrims gathered at the Vatican for the special event.",
            "The Pope's message focused on peace and unity.",
            "A choir sang hymns during the religious ceremony.",
            "The Pope blessed the congregation at the event.",
            "Many people traveled far to see the Pope speak.",
            "The religious event was broadcast worldwide.",
            "The Pope addressed issues of faith and compassion.",
            "Candles were lit as the Pope prayed for peace.",
            "The Pope's sermon inspired many attendees."
        ]
        # 10 finance sentences (same event)
        finance = [
            "The stock market surged after the Federal Reserve's announcement.",
            "Investors reacted positively to the Fed's new policy.",
            "The Federal Reserve raised interest rates by 0.25%.",
            "Financial analysts discussed the Fed's decision on TV.",
            "The Fed's move was expected by most economists.",
            "Stocks rallied as the Fed signaled economic confidence.",
            "The Federal Reserve's chair gave a press conference.",
            "Bond yields rose following the Fed's announcement.",
            "The Fed's policy change aims to control inflation.",
            "Wall Street responded with optimism to the Fed's news."
        ]

        all_sentences = (
            [(s, "Basketball", "Basketball summary") for s in basketball] +
            [(s, "Religion", "Religion summary") for s in religion] +
            [(s, "Finance", "Finance summary") for s in finance]
        )
        random.shuffle(all_sentences)
        
        print(f"Original shuffled: {all_sentences}")

        news_list = []
        for idx, (sentence, topic, summary) in enumerate(all_sentences):
            news_list.append(News(idx, "20240101T120000", sentence, f"{topic} News {idx}", f"url{idx}", summary))
        labels = cluster(news_list)
        # There should be 3 clusters, each with 10 items
        clusters = {}
        for idx, label in enumerate(labels):
            clusters.setdefault(label, []).append(news_list[idx].content)
        print(f"Clusters: {clusters}")
        cluster_sizes = sorted([len(v) for v in clusters.values()])
        self.assertEqual(cluster_sizes, [10, 10, 10])

    def test_cluster_with_real_model_new_topics(self):
        # 10 technology sentences (same event)
        technology = [
            "AI is transforming the tech industry at a rapid pace.",
            "Machine learning models are now used in self-driving cars.",
            "Tech companies are investing heavily in artificial intelligence.",
            "AI-powered assistants are becoming more common in households.",
            "The latest smartphone uses AI for better photography.",
            "Researchers developed a new AI algorithm for language translation.",
            "AI is being used to detect fraud in financial transactions.",
            "Artificial intelligence is revolutionizing healthcare diagnostics.",
            "AI chatbots are improving customer service experiences.",
            "The government is considering regulations for AI development."
        ]
        # 10 environment sentences (same event)
        environment = [
            "Climate change is causing more frequent extreme weather events.",
            "Scientists warn about the rising global temperatures.",
            "Efforts to reduce carbon emissions are increasing worldwide.",
            "Renewable energy sources are being adopted to fight climate change.",
            "Melting glaciers are a visible sign of global warming.",
            "Climate activists are calling for urgent action.",
            "Governments are meeting to discuss climate policies.",
            "Wildfires have become more common due to climate change.",
            "Sea levels are rising as a result of global warming.",
            "New technologies are being developed to capture carbon dioxide."
        ]
        # 10 health sentences (same event)
        health = [
            "COVID-19 vaccines have been distributed globally.",
            "Hospitals are managing a surge in COVID-19 patients.",
            "Researchers are studying the long-term effects of COVID-19.",
            "Mask mandates have been implemented in many cities.",
            "Health officials urge people to get vaccinated against COVID-19.",
            "New variants of the coronavirus are being monitored.",
            "COVID-19 testing is widely available in urban areas.",
            "The government is funding research on COVID-19 treatments.",
            "Public health campaigns focus on preventing the spread of COVID-19."
        ]

        all_sentences = (
            [(s, "Technology", "Technology summary") for s in technology] +
            [(s, "Environment", "Environment summary") for s in environment] +
            [(s, "Health", "Health summary") for s in health]
        )
        random.shuffle(all_sentences)

        print(f"Original shuffled: {all_sentences}")

        news_list = []
        for idx, (sentence, topic, summary) in enumerate(all_sentences):
            news_list.append(News(idx, "20240101T120000", sentence, f"{topic} News {idx}", f"url{idx}", summary))
        labels = cluster(news_list)
        # There should be 3 clusters, each with 10 items
        clusters = {}
        for idx, label in enumerate(labels):
            clusters.setdefault(label, []).append(news_list[idx].content)
        print(f"Clusters: {clusters}")
        cluster_sizes = sorted([len(v) for v in clusters.values()])
        self.assertEqual(cluster_sizes, [10, 10, 10])

if __name__ == "__main__":
    unittest.main()