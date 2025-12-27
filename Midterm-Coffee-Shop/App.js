import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, 
  Image, Animated, Easing 
} from 'react-native';
import axios from 'axios';

// YAHAN APNA IP ADDRESS DALO
const API_BASE_URL = 'http://192.168.10.14:3000';

// Online images URLs - No local files needed
const menuImages = {
  'Espresso': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop',
  'Capotecino': 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=200&h=200&fit=crop',
  'Iced Coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop',
  'Latte': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=200&h=200&fit=crop',
  'Croissant': 'https://images.unsplash.com/photo-1555507036-ab794f27d2e9?w=200&h=200&fit=crop',
  'Muffin': 'https://images.unsplash.com/photo-1576613109753-27804de2c1a7?w=200&h=200&fit=crop',
  'default': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop'
};

export default function App() {
  const [menuItems, setMenuItems] = useState([]);
  const [randomItem, setRandomItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('menu');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const cartPulseAnim = useRef(new Animated.Value(1)).current;

  // Load menu on app start with animation
  useEffect(() => {
    fetchFullMenu();
    startAnimations();
  }, []);

  // Cart change pe animation
  useEffect(() => {
    if (cart.length > 0) {
      cartPulseAnimation();
    }
  }, [cart.length]);

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Slide up animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  };

  const cartPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(cartPulseAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cartPulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const bounceAnimation = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const getImageSource = (itemName) => {
    return { uri: menuImages[itemName] || menuImages['default'] };
  };

  // Full menu fetch karne ka function
  const fetchFullMenu = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/menu`);
      setMenuItems(response.data);
      setRandomItem(null);
      setActiveTab('menu');
      startAnimations();
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch menu: ' + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  // Random item fetch karne ka function
  const fetchRandomItem = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/menu/random`);
      setRandomItem(response.data);
      setMenuItems([]);
      setActiveTab('menu');
      bounceAnimation(); // Random item pe bounce effect
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch random item: ' + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  // Cart mein item add karna
  const addToCart = (item) => {
    if (!item.inStock) {
      Alert.alert('Out of Stock', `${item.name} is currently out of stock`);
      return;
    }

    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    
    // Add to cart animation
    bounceAnimation();
    Alert.alert('Added to Cart', `🛒 ${item.name} added to cart`);
  };

  // Cart se item remove karna
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  // Cart mein quantity update karna
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item =>
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Cart total calculate karna
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Order place karna
  const placeOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before ordering');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map(item => ({
          menuItemId: item._id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
      Alert.alert(
        '🎉 Order Placed!', 
        `Your order has been placed successfully!\n\n📦 Order ID: ${response.data.order.orderId}\n💰 Total: Rs. ${response.data.order.totalAmount}`
      );
      setCart([]);
      setShowCart(false);
      fetchOrders();
      setActiveTab('orders');
    } catch (error) {
      Alert.alert('Order Failed', error.response?.data?.error || 'Failed to place order');
    }
    setLoading(false);
  };

  // Orders fetch karna
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/orders`);
      setOrders(response.data);
      setActiveTab('orders');
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Header with Animation */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <Image 
            source={getImageSource('default')}
            style={styles.logo}
          />
          <Text style={styles.title}>Full-Slash Coffee</Text>
        </View>
        
        <Animated.View style={{ transform: [{ scale: cartPulseAnim }] }}>
          <TouchableOpacity style={styles.cartButton} onPress={() => setShowCart(true)}>
            <Text style={styles.cartIcon}>🛒</Text>
            <Text style={styles.cartCount}>{cart.length}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Navigation Tabs */}
      <Animated.View 
        style={[
          styles.tabContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'menu' && styles.activeTab]} 
          onPress={fetchFullMenu}
        >
          <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>📋 Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]} 
          onPress={fetchOrders}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>📦 Orders</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <ScrollView style={styles.contentContainer}>
        {activeTab === 'menu' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={fetchFullMenu}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>📖 Full Menu</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={fetchRandomItem}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>🎲 Surprise Me</Text>
              </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
                <Text style={styles.loading}>☕ Brewing your order...</Text>
              </Animated.View>
            )}

            {/* Random Item Display */}
            {randomItem && (
              <Animated.View 
                style={[
                  styles.randomContainer,
                  { transform: [{ scale: bounceAnim }] }
                ]}
              >
                <Text style={styles.sectionTitle}>🎉 Surprise Item!</Text>
                <View style={[styles.menuItem, styles.randomItem]}>
                  <Image 
                    source={getImageSource(randomItem.name)}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemDetails}>
                    <Text style={styles.randomItemName}>{randomItem.name}</Text>
                    <Text style={styles.itemCategory}>{randomItem.category}</Text>
                    <Text style={styles.randomItemPrice}>Rs. {randomItem.price}</Text>
                    <Text style={styles.stockStatusGreen}>In Stock ✅</Text>
                    <TouchableOpacity 
                      style={styles.addToCartButton}
                      onPress={() => addToCart(randomItem)}
                    >
                      <Text style={styles.addToCartButtonText}>🛒 Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Full Menu Display */}
            {menuItems.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>📋 Full Menu ({menuItems.length} items)</Text>
                {menuItems.map((item, index) => (
                  <Animated.View 
                    key={index} 
                    style={[
                      styles.menuItem,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                      }
                    ]}
                  >
                    <Image 
                      source={getImageSource(item.name)}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                      </View>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <View style={styles.itemFooter}>
                        <Text style={[
                          styles.stockStatus, 
                          { color: item.inStock ? 'green' : 'red' }
                        ]}>
                          {item.inStock ? '✅ In Stock' : '❌ Out of Stock'}
                        </Text>
                        {item.inStock && (
                          <TouchableOpacity 
                            style={styles.addToCartButton}
                            onPress={() => addToCart(item)}
                          >
                            <Text style={styles.addToCartButtonText}>🛒 Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'orders' && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>📦 My Orders ({orders.length})</Text>
            {orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.noOrders}>No orders yet</Text>
                <Text style={styles.emptySubtitle}>Start ordering from our delicious menu!</Text>
              </View>
            ) : (
              orders.map((order, index) => (
                <Animated.View 
                  key={index} 
                  style={[
                    styles.orderItem,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }]
                    }
                  ]}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>📦 Order #: {order.orderId}</Text>
                    <Text style={[
                      styles.orderStatus,
                      { 
                        color: order.status === 'completed' ? 'green' : 
                               order.status === 'preparing' ? 'orange' : 'blue' 
                      }
                    ]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.orderDate}>
                    🕒 {new Date(order.createdAt).toLocaleString()}
                  </Text>
                  {order.items.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.orderItemDetail}>
                      <Text style={styles.orderItemName}>
                        • {item.menuItem.name} x {item.quantity}
                      </Text>
                      <Text style={styles.orderItemPrice}>
                        Rs. {item.price * item.quantity}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.orderTotal}>
                    <Text style={styles.totalText}>💰 Total: Rs. {order.totalAmount}</Text>
                  </View>
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Cart Modal */}
      <Modal
        visible={showCart}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛒 Shopping Cart</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Text style={styles.closeModal}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartEmoji}>😔</Text>
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Text style={styles.emptyCartSubtitle}>Add some delicious items!</Text>
              </View>
            ) : (
              <ScrollView style={styles.cartItems}>
                {cart.map((item, index) => (
                  <View key={index} style={styles.cartItem}>
                    <Image 
                      source={getImageSource(item.name)}
                      style={styles.cartItemImage}
                    />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>Rs. {item.price} each</Text>
                      <Text style={styles.cartItemTotal}>Rs. {item.price * item.quantity}</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item._id, item.quantity - 1)}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item._id, item.quantity + 1)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeFromCart(item._id)}
                      >
                        <Text style={styles.removeButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {cart.length > 0 && (
              <View style={styles.cartTotal}>
                <Text style={styles.totalAmount}>💰 Total: Rs. {getCartTotal()}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCart(false)}
              >
                <Text style={styles.closeButtonText}>← Continue Shopping</Text>
              </TouchableOpacity>
              
              {cart.length > 0 && (
                <TouchableOpacity 
                  style={styles.orderButton}
                  onPress={placeOrder}
                  disabled={loading}
                >
                  <Text style={styles.orderButtonText}>
                    {loading ? '⏳ Placing Order...' : '✅ Place Order'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#6F4E37',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  cartIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  cartCount: {
    color: '#6F4E37',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#6F4E37',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  actionButton: {
    backgroundColor: '#6F4E37',
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loading: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  randomContainer: {
    marginBottom: 25,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  randomItem: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 5,
    borderLeftColor: '#FFA000',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 15,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemDetails: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  randomItemName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFA000',
    textAlign: 'center',
    marginBottom: 5,
  },
  randomItemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 5,
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockStatusGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 10,
  },
  addToCartButton: {
    backgroundColor: '#6F4E37',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Cart Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6F4E37',
  },
  closeModal: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptyCartSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  cartItems: {
    maxHeight: 400,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#6F4E37',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
  removeButtonText: {
    fontSize: 16,
  },
  cartTotal: {
    borderTopWidth: 2,
    borderTopColor: '#6F4E37',
    paddingTop: 15,
    marginTop: 10,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  orderButton: {
    flex: 2,
    backgroundColor: '#6F4E37',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  orderButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Orders Styles
  orderItem: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  orderItemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingLeft: 10,
  },
  orderItemName: {
    fontSize: 14,
    color: '#333',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  orderTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6F4E37',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 15,
  },
  noOrders: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});