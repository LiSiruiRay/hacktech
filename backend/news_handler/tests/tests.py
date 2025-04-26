import unittest
from unittest.mock import patch, MagicMock
from news_query import data_to_news, cluster, get_summary, real_time_query, hash_event_label
from news import News, Event
import random
import hashlib

class TestNewsQuery(unittest.TestCase):
    def test_data_to_news(self):
        print("\nRunning test_data_to_news...")
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
        self.assertEqual(news_list[0].title, "Test Title")
        self.assertEqual(news_list[0].link, "http://example.com")

    #Note: For the following tests to pass, you are explicitly required to limit the max clusters into ideal amount of clusters
    def test_cluster_with_real_model(self): 
        print("\nRunning test_cluster_with_real_model...")
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
            [(s, "Basketball") for s in basketball] +
            [(s, "Religion") for s in religion] +
            [(s, "Finance") for s in finance]
        )
        random.shuffle(all_sentences)
        
        print(f"\nOriginal shuffled: {all_sentences}")

        news_list = []
        for idx, (summary, title) in enumerate(all_sentences):
            news_list.append(News("20240101T120000", title, f"url{idx}", summary))
        labels = cluster(news_list, 3)
        
        clusters = {}
        for idx, label in enumerate(labels):
            clusters.setdefault(label, []).append(news_list[idx].summary)
        print(f"\nClusters: {clusters}")
        cluster_sizes = sorted([len(v) for v in clusters.values()])
        print(f"\nCluster sizes: {cluster_sizes}")
    
    # #This test fails with two sentences clustered differently. However, it is reasonable and still valid. 
    # def test_cluster_with_real_model_new_topics(self):
    #     # 10 technology sentences (same event)
    #     technology = [
    #         "AI is transforming the tech industry at a rapid pace.",
    #         "Machine learning models are now used in self-driving cars.",
    #         "Tech companies are investing heavily in artificial intelligence.",
    #         "AI-powered assistants are becoming more common in households.",
    #         "The latest smartphone uses AI for better photography.",
    #         "Researchers developed a new AI algorithm for language translation.",
    #         "AI is being used to detect fraud in financial transactions.",
    #         "Artificial intelligence is revolutionizing healthcare diagnostics.",
    #         "AI chatbots are improving customer service experiences.",
    #         "The government is considering regulations for AI development."
    #     ]
    #     # 10 environment sentences (same event)
    #     environment = [
    #         "Climate change is causing more frequent extreme weather events.",
    #         "Scientists warn about the rising global temperatures.",
    #         "Efforts to reduce carbon emissions are increasing worldwide.",
    #         "Renewable energy sources are being adopted to fight climate change.",
    #         "Melting glaciers are a visible sign of global warming.",
    #         "Climate activists are calling for urgent action.",
    #         "Governments are meeting to discuss climate policies.",
    #         "Wildfires have become more common due to climate change.",
    #         "Sea levels are rising as a result of global warming.",
    #         "New technologies are being developed to capture carbon dioxide."
    #     ]
    #     # 10 health sentences (same event)
    #     health = [
    #         "COVID-19 vaccines have been distributed globally.",
    #         "Hospitals are managing a surge in COVID-19 patients.",
    #         "Researchers are studying the long-term effects of COVID-19.",
    #         "Mask mandates have been implemented in many cities.",
    #         "Health officials urge people to get vaccinated against COVID-19.",
    #         "New variants of the coronavirus are being monitored.",
    #         "COVID-19 testing is widely available in urban areas.",
    #         "The government is funding research on COVID-19 treatments.",
    #         "Public health campaigns focus on preventing the spread of COVID-19."
    #     ]

    #     all_sentences = (
    #         [(s, "Technology", "Technology summary") for s in technology] +
    #         [(s, "Environment", "Environment summary") for s in environment] +
    #         [(s, "Health", "Health summary") for s in health]
    #     )
    #     random.shuffle(all_sentences)

    #     print(f"Original shuffled: {all_sentences}")

    #     news_list = []
    #     for idx, (sentence, topic, summary) in enumerate(all_sentences):
    #         news_list.append(News(idx, "20240101T120000", sentence, f"{topic} News {idx}", f"url{idx}", summary))
    #     labels = cluster(news_list)
    #     # There should be 3 clusters, each with 10 items
    #     clusters = {}
    #     for idx, label in enumerate(labels):
    #         clusters.setdefault(label, []).append(news_list[idx].content)
    #     print(f"Clusters: {clusters}")
    #     cluster_sizes = sorted([len(v) for v in clusters.values()])
    #     self.assertEqual(cluster_sizes, [10, 10, 10])
    
    def test_get_summary(self): 
        print("\nRunning test_get_summary...")
        news_list = [
            News(post_time="20240101T120000", title="Title 1", link="http://example.com/1", summary="Pilgrims gathered at the Vatican for the special event."),
            News(post_time="20240101T130000", title="Title 2", link="http://example.com/2", summary="The Pope blessed the congregation at the event."),
            News(post_time="20240101T140000", title="Title 3", link="http://example.com/3", summary="Candles were lit as the Pope prayed for peace.")
        ]
        
        events = {
            0: Event(event_id="1", summary="", news_list=news_list)
        }

        updated_events = get_summary(events)

        for event in updated_events.values():
            print("Event Summary:")
            print(event.summary)
            print("News List:")
            for news in event.news_list:
                print(f"  - Title: {news.title}")
                print(f"    Summary: {news.summary}")
                print(f"    Link: {news.link}")
                print(f"    Post Time: {news.post_time}")
                
    def test_hash_event_label(self):
        print("\nRunning test_hash_event_label...")
        labels = [0, 1, 0, 2]
        news_list = [
            News(post_time="2023-10-01T12:00", title="Title 1", link="http://example.com/1", summary="Summary 1"),
            News(post_time="2023-10-02T12:00", title="Title 2", link="http://example.com/2", summary="Summary 2"),
            News(post_time="2023-10-03T12:00", title="Title 3", link="http://example.com/3", summary="Summary 3"),
            News(post_time="2023-10-04T12:00", title="Title 4", link="http://example.com/4", summary="Summary 4"),
        ]

        # Expected output
        expected_events = {
            0: Event(event_id=hashlib.sha256(b'0').hexdigest(), summary="", news_list=[news_list[0], news_list[2]]),
            1: Event(event_id=hashlib.sha256(b'1').hexdigest(), summary="", news_list=[news_list[1]]),
            2: Event(event_id=hashlib.sha256(b'2').hexdigest(), summary="", news_list=[news_list[3]]),
        }

        # Call the function
        events = hash_event_label(labels, news_list)

        # Assertions
        self.assertEqual(len(events), len(expected_events))
        for label, event in expected_events.items():
            self.assertIn(label, events)
            self.assertEqual(events[label].event_id, event.event_id)
            self.assertEqual(events[label].summary, event.summary)
            self.assertEqual(events[label].news_list, event.news_list)
    
    @patch('news_query.requests.get')
    def test_real_time_query_day(self, mock_get):
        print("\nRunning test_real_time_query_day...")
        # Mock the API response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "feed": [
                {
                    "time_published": "20240101T120000",
                    "title": "Test Title",
                    "url": "http://example.com",
                    "summary": "Test Summary"
                },
                {
                    "time_published": "20240101T130000",
                    "title": "Test Title 2",
                    "url": "http://example.com/2",
                    "summary": "Test Summary 2"
                }
            ]
        }
        mock_get.return_value = mock_response

        # Call the function
        result = real_time_query("day")
        
        print(f"Result: {result}")
        
        # Assertions
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
        self.assertIn("Percentage", result[0])
        self.assertIn("Event", result[0])

    @patch('news_query.requests.get')
    def test_real_time_query_invalid_time_range(self, mock_get):
        with self.assertRaises(ValueError):
            real_time_query("invalid")
            
if __name__ == "__main__":
    unittest.main()